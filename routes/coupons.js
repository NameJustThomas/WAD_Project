// routes/coupons.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.post('/apply-coupon', async (req, res) => {
  const { code } = req.body;
  const currentDate = new Date();

  try {
    const [rows] = await db.execute(
      `SELECT * FROM coupons WHERE code = ? AND (expires_at IS NULL OR expires_at > ?)`,
      [code, currentDate]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid or expired coupon.' });
    }

    const coupon = rows[0];

    if (coupon.usage_limit !== null && coupon.times_used >= coupon.usage_limit) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit reached.' });
    }

    // Update times_used (optional; you might do this only after a successful order)
    await db.execute(
      `UPDATE coupons SET times_used = times_used + 1 WHERE id = ?`,
      [coupon.id]
    );

    res.json({
      success: true,
      message: 'Coupon applied successfully!',
      discount: {
        type: coupon.discount_type,
        value: coupon.discount_value,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
