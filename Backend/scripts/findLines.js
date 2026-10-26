import fs from 'fs';
import path from 'path';

const filePath = 'z:/projects/yatrataxi/frontend/src/modules/driver/pages/DriverHome.jsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('GoogleMap') || line.includes('MapGrid') || line.includes('premium_grid_map') || line.includes('@react-google-maps/api')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
