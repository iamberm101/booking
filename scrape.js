// scrape.js (หรือรวมไว้ใน proxy-server ก็ได้)
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();

app.get('/api/scrape-booking', async (req, res) => {
  const targetURL = 'https://example-vendor.com/booking'; // ← แก้เป็นของจริง

  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto(targetURL, { waitUntil: 'networkidle0' });

    // ❗ แก้ selector ให้ตรงกับส่วนที่คุณต้องการ (ไม่เอา header)
    const content = await page.evaluate(() => {
      const bookingSection = document.querySelector('.booking-container'); // <– เปลี่ยน selector ตรงนี้
      return bookingSection ? bookingSection.innerHTML : 'ไม่พบ booking';
    });

    await browser.close();
    res.send(content);
  } catch (err) {
    console.error('Scrape failed:', err.message);
    res.status(500).send('เกิดข้อผิดพลาดในการโหลดข้อมูล');
  }
});

app.listen(3001, () => {
  console.log('✅ Scraper running on http://localhost:3001');
});
