import { addWatermark } from './server/watermark.ts';
import fs from 'fs';

// Create a simple test image (red square)
const sharp = (await import('sharp')).default;
const testImage = await sharp({
  create: {
    width: 800,
    height: 600,
    channels: 3,
    background: { r: 200, g: 220, b: 240 }
  }
}).jpeg().toBuffer();

// Add watermark
const watermarked = await addWatermark(testImage, {
  text: 'hambry.com',
  position: 'bottom-right',
  opacity: 0.7,
  fontSize: 16,
  textColor: '255,255,255',
  bgOpacity: 0.6
});

// Save to file
fs.writeFileSync('/home/ubuntu/test-watermark-canvas-output.jpg', watermarked);
console.log('Watermarked image saved to /home/ubuntu/test-watermark-canvas-output.jpg');
