const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Configure multer for message attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/messages';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'msg-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.includes('document');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and documents are allowed!'));
    }
  }
});

// Create a message thread if it doesn't exist
router.post('/create-thread', authenticate, async (req, res) => {
  try {
    const { job_id, other_user_id } = req.body;

    if (!job_id || !other_user_id) {
      return res.status(400).json({ error: 'Job ID and other user ID are required' });
    }

    // Verify access to the job
    const jobCheck = await pool.query(
      `SELECT jp.customer_id 
       FROM job_postings jp 
       WHERE jp.id = $1`,
      [job_id]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const jobCustomerId = jobCheck.rows[0].customer_id;

    // Determine customer and tradesperson IDs
    let customerId, tradespersonId;
    if (req.user.id === jobCustomerId) {
      customerId = req.user.id;
      tradespersonId = other_user_id;
    } else {
      customerId = jobCustomerId;
      tradespersonId = req.user.id;
    }

    console.log(`Creating thread: Job ${job_id}, Customer ${customerId}, Tradesperson ${tradespersonId}, Requester ${req.user.id}`);

    // Create or get existing thread
    const result = await pool.query(
      `INSERT INTO message_threads (job_id, customer_id, tradesperson_id, last_message_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (job_id, customer_id, tradesperson_id) 
       DO UPDATE SET last_message_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [job_id, customerId, tradespersonId]
    );

    res.json({ thread: result.rows[0] });
  } catch (error) {
    console.error('Create thread error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get message threads for authenticated user
router.get('/threads', authenticate, async (req, res) => {
  try {
    const query = `
      SELECT 
        mt.*,
        jp.title as job_title,
        jp.status as job_status,
        customer.first_name as customer_first_name,
        customer.last_name as customer_last_name,
        tp_user.first_name as tradesperson_first_name,
        tp_user.last_name as tradesperson_last_name,
        tp.business_name,
        cp.profile_image_url as customer_image,
        tp.profile_image_url as tradesperson_image,
        (SELECT COUNT(*) FROM messages m WHERE 
          ((m.sender_id = mt.customer_id AND m.receiver_id = mt.tradesperson_id) OR 
           (m.sender_id = mt.tradesperson_id AND m.receiver_id = mt.customer_id)) 
          AND (mt.job_id IS NULL AND m.job_id IS NULL OR m.job_id = mt.job_id) 
          AND m.receiver_id = $1 AND m.is_read = FALSE
        ) as unread_count,
        (SELECT m.message FROM messages m WHERE 
          ((m.sender_id = mt.customer_id AND m.receiver_id = mt.tradesperson_id) OR 
           (m.sender_id = mt.tradesperson_id AND m.receiver_id = mt.customer_id)) 
          AND (mt.job_id IS NULL AND m.job_id IS NULL OR m.job_id = mt.job_id)
          ORDER BY m.created_at DESC LIMIT 1
        ) as last_message
      FROM message_threads mt
      LEFT JOIN job_postings jp ON mt.job_id = jp.id
      LEFT JOIN users customer ON mt.customer_id = customer.id
      LEFT JOIN users tp_user ON mt.tradesperson_id = tp_user.id
      LEFT JOIN tradesperson_profiles tp ON mt.tradesperson_id = tp.user_id
      LEFT JOIN customer_profiles cp ON mt.customer_id = cp.user_id
      WHERE mt.customer_id = $1 OR mt.tradesperson_id = $1
      ORDER BY mt.last_message_at DESC
    `;

    const result = await pool.query(query, [req.user.id]);
    res.json({ threads: result.rows });
  } catch (error) {
    console.error('Get message threads error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get messages for a specific job conversation (jobId can be 'direct' for direct contact)
router.get('/job/:jobId/conversation/:otherUserId', authenticate, async (req, res) => {
  try {
    const { jobId, otherUserId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const isDirectContact = jobId === 'direct' || jobId === 'null' || jobId === '0';
    let actualJobId = isDirectContact ? null : parseInt(jobId);
    
    // Verify user has access to this conversation
    if (!isDirectContact) {
      const jobCheck = await pool.query(
        'SELECT customer_id FROM job_postings WHERE id = $1',
        [actualJobId]
      );

      if (jobCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const jobCustomerId = jobCheck.rows[0].customer_id;
      
      // Allow access if:
      // 1. User is the job owner (customer)
      // 2. User is a tradesperson and other user is the customer
      let hasAccess = false;
      
      if (req.user.id === jobCustomerId) {
        hasAccess = true;
      } else if (parseInt(otherUserId) === jobCustomerId) {
        hasAccess = true;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Unauthorized access to this conversation' });
      }
    } else {
      // For direct contact, verify users are customer and tradesperson
      const otherUserCheck = await pool.query(
        'SELECT role FROM users WHERE id = $1',
        [otherUserId]
      );
      
      if (otherUserCheck.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // One must be customer, one must be tradesperson
      const userCheck = await pool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.user.id]
      );
      
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userRole = userCheck.rows[0].role;
      const otherUserRole = otherUserCheck.rows[0].role;
      
      if (!((userRole === 'customer' && otherUserRole === 'tradesperson') || 
            (userRole === 'tradesperson' && otherUserRole === 'customer'))) {
        return res.status(403).json({ error: 'Direct contact only allowed between customer and tradesperson' });
      }
    }

    // Get messages
    const query = `
      SELECT 
        m.*,
        sender.first_name as sender_first_name,
        sender.last_name as sender_last_name,
        receiver.first_name as receiver_first_name,
        receiver.last_name as receiver_last_name
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users receiver ON m.receiver_id = receiver.id
      WHERE m.job_id ${isDirectContact ? 'IS NULL' : '= $1'}
        AND ((m.sender_id = $${isDirectContact ? '1' : '2'} AND m.receiver_id = $${isDirectContact ? '2' : '3'}) OR 
             (m.sender_id = $${isDirectContact ? '2' : '3'} AND m.receiver_id = $${isDirectContact ? '1' : '2'}))
      ORDER BY m.created_at DESC
      LIMIT $${isDirectContact ? '3' : '4'} OFFSET $${isDirectContact ? '4' : '5'}
    `;

    const offset = (page - 1) * limit;
    const queryParams = isDirectContact 
      ? [req.user.id, otherUserId, limit, offset]
      : [actualJobId, req.user.id, otherUserId, limit, offset];
    
    const result = await pool.query(query, queryParams);

    // Mark messages as read
    const markReadQuery = `
      UPDATE messages 
      SET is_read = TRUE 
      WHERE job_id ${isDirectContact ? 'IS NULL' : '= $1'} 
        AND sender_id = $${isDirectContact ? '1' : '2'} 
        AND receiver_id = $${isDirectContact ? '2' : '3'} 
        AND is_read = FALSE
    `;
    
    const markReadParams = isDirectContact 
      ? [otherUserId, req.user.id]
      : [actualJobId, otherUserId, req.user.id];
    
    await pool.query(markReadQuery, markReadParams);

    res.json({ messages: result.rows.reverse() }); // Reverse to show oldest first
  } catch (error) {
    console.error('Get conversation messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send a message (job_id is optional for direct contact)
router.post('/send', authenticate, upload.single('attachment'), async (req, res) => {
  try {
    const { job_id, receiver_id, message, message_type = 'text' } = req.body;

    if (!receiver_id || (!message && !req.file)) {
      return res.status(400).json({ error: 'Receiver ID and message or attachment are required' });
    }

    // If no job_id, this is a direct contact message
    // We'll use a special job_id of 0 or null to represent general inquiries
    let actualJobId = job_id;
    let jobCustomerId = null;
    
    if (job_id) {
      // Verify user has access to send messages for this job
      const jobCheck = await pool.query(
        `SELECT jp.customer_id 
         FROM job_postings jp 
         WHERE jp.id = $1`,
        [job_id]
      );

      if (jobCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      jobCustomerId = jobCheck.rows[0].customer_id;

      // Check if user is either the customer or has bid on this job
      let hasAccess = false;
      let accessReason = '';
      
      if (req.user.id === jobCustomerId) {
        hasAccess = true;
        accessReason = 'job owner';
      } else {
        // Check if tradesperson has bid on this job
        const bidCheck = await pool.query(
          'SELECT 1 FROM job_bids WHERE job_id = $1 AND tradesperson_id = $2',
          [job_id, req.user.id]
        );
        
        if (bidCheck.rows.length > 0) {
          hasAccess = true;
          accessReason = 'has bid';
        } else {
          // Also allow if the job is open and the tradesperson is trying to communicate
          const jobStatusCheck = await pool.query(
            'SELECT status FROM job_postings WHERE id = $1 AND status = $2',
            [job_id, 'open']
          );
          
          if (jobStatusCheck.rows.length > 0) {
            hasAccess = true;
            accessReason = 'job is open';
          }
        }
      }

      console.log(`Message access check: User ${req.user.id}, Job ${job_id}, Customer ${jobCustomerId}, Access: ${hasAccess}, Reason: ${accessReason}`);

      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Unauthorized to send messages for this job',
          debug: {
            userId: req.user.id,
            jobId: job_id,
            jobCustomerId: jobCustomerId,
            userRole: req.user.role
          }
        });
      }
    } else {
      // Direct contact without a job
      // Verify receiver is a tradesperson
      const receiverCheck = await pool.query(
        'SELECT role FROM users WHERE id = $1',
        [receiver_id]
      );
      
      if (receiverCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Receiver not found' });
      }
      
      const receiverRole = receiverCheck.rows[0].role;
      
      // Check if a thread already exists for this conversation
      const existingThread = await pool.query(
        `SELECT * FROM message_threads 
         WHERE job_id IS NULL 
         AND ((customer_id = $1 AND tradesperson_id = $2) OR (customer_id = $2 AND tradesperson_id = $1))`,
        [req.user.id, receiver_id]
      );
      
      if (existingThread.rows.length > 0) {
        // Thread exists - allow reply from either party
        if (req.user.role === 'customer') {
          jobCustomerId = req.user.id;
        } else if (req.user.role === 'tradesperson' && receiverRole === 'customer') {
          jobCustomerId = receiver_id; // The customer is the job owner in this context
        } else {
          return res.status(403).json({ error: 'Invalid conversation participants' });
        }
        actualJobId = null;
      } else {
        // No thread exists - only customers can initiate direct contact
        if (req.user.role !== 'customer') {
          return res.status(403).json({ error: 'Only customers can initiate direct contact' });
        }
        
        if (receiverRole !== 'tradesperson') {
          return res.status(400).json({ error: 'Can only message tradespeople directly' });
        }
        
        // Use NULL job_id for direct contact messages
        actualJobId = null;
        jobCustomerId = req.user.id;
      }
    }

    // Handle attachment
    let attachmentUrl = null;
    let finalMessageType = message_type;
    
    if (req.file) {
      attachmentUrl = `/uploads/messages/${req.file.filename}`;
      finalMessageType = req.file.mimetype.startsWith('image/') ? 'image' : 'file';
    }

    // Insert message (job_id can be NULL for direct contact)
    const messageResult = await pool.query(
      `INSERT INTO messages (job_id, sender_id, receiver_id, message, message_type, attachment_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [actualJobId, req.user.id, receiver_id, message || '', finalMessageType, attachmentUrl]
    );

    // Create or update message thread
    // For direct contact (no job), use NULL job_id
    const customerId = jobCustomerId || req.user.id;
    const tradespersonId = req.user.id === customerId ? receiver_id : req.user.id;

    // For direct contact, we need to handle NULL job_id in the unique constraint
    // We'll use a special approach: check if thread exists, if not create it
    if (actualJobId) {
      await pool.query(
        `INSERT INTO message_threads (job_id, customer_id, tradesperson_id, last_message_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (job_id, customer_id, tradesperson_id) 
         DO UPDATE SET last_message_at = CURRENT_TIMESTAMP`,
        [actualJobId, customerId, tradespersonId]
      );
    } else {
      // For direct contact, check if thread exists without job_id
      const existingThread = await pool.query(
        `SELECT id FROM message_threads 
         WHERE job_id IS NULL AND customer_id = $1 AND tradesperson_id = $2`,
        [customerId, tradespersonId]
      );
      
      if (existingThread.rows.length === 0) {
        await pool.query(
          `INSERT INTO message_threads (job_id, customer_id, tradesperson_id, last_message_at)
           VALUES (NULL, $1, $2, CURRENT_TIMESTAMP)`,
          [customerId, tradespersonId]
        );
      } else {
        await pool.query(
          `UPDATE message_threads 
           SET last_message_at = CURRENT_TIMESTAMP
           WHERE job_id IS NULL AND customer_id = $1 AND tradesperson_id = $2`,
          [customerId, tradespersonId]
        );
      }
    }

    // Get the complete message with sender info
    const completeMessageResult = await pool.query(
      `SELECT 
        m.*,
        sender.first_name as sender_first_name,
        sender.last_name as sender_last_name
       FROM messages m
       LEFT JOIN users sender ON m.sender_id = sender.id
       WHERE m.id = $1`,
      [messageResult.rows[0].id]
    );

    const newMessage = completeMessageResult.rows[0];

    // Emit real-time notification to receiver
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    const receiverIdStr = receiver_id.toString();
    const receiverSocketId = connectedUsers.get(receiverIdStr);
    
    console.log(`Sending notification: Receiver ${receiver_id} (${receiverIdStr}), Socket ${receiverSocketId}, Connected users:`, Array.from(connectedUsers.keys()));
    
    if (receiverSocketId) {
      console.log(`Emitting new_message to receiver ${receiver_id} (socket ${receiverSocketId})`);
      io.to(receiverSocketId).emit('new_message', {
        message: newMessage,
        job_id: job_id,
        sender_id: req.user.id
      });
    } else {
      console.log(`Receiver ${receiver_id} not connected`);
    }

    // Also emit to sender for real-time update
    const senderSocketId = connectedUsers.get(req.user.id.toString());
    if (senderSocketId) {
      console.log(`Emitting message_sent to sender ${req.user.id} (socket ${senderSocketId})`);
      io.to(senderSocketId).emit('message_sent', {
        message: newMessage,
        job_id: job_id
      });
    }

    res.status(201).json({ message: newMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark messages as read
router.patch('/mark-read', authenticate, async (req, res) => {
  try {
    const { job_id, sender_id } = req.body;

    if (!job_id || !sender_id) {
      return res.status(400).json({ error: 'Job ID and sender ID are required' });
    }

    const result = await pool.query(
      `UPDATE messages 
       SET is_read = TRUE 
       WHERE job_id = $1 AND sender_id = $2 AND receiver_id = $3 AND is_read = FALSE`,
      [job_id, sender_id, req.user.id]
    );

    res.json({ 
      message: 'Messages marked as read',
      updatedCount: result.rowCount 
    });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread message count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND is_read = FALSE',
      [req.user.id]
    );

    res.json({ unreadCount: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
