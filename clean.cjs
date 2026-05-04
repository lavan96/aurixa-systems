const fs = require('fs');
const path = require('path');

const icons = [
  'ArrowRight', 'Menu', 'X', 'Network', 'ShieldCheck', 'Cpu', 'Terminal', 'Zap', 
  'Calculator', 'FileText', 'LayoutDashboard', 'MapPin', 'Database', 'Users', 
  'Globe', 'LineChart', 'Target', 'Crosshair', 'TrendingUp', 'Briefcase', 
  'Landmark', 'UserCheck', 'Hexagon', 'ShieldAlert', 'Lock', 'Key'
];

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  icons.forEach(icon => {
    const regex = new RegExp(`(<${icon}\\s+)([^>]*?)(/?>)`, 'g');
    content = content.replace(regex, (match, p1, p2, p3) => {
      let attrs = p2;
      attrs = attrs.replace(/text-\[\#[A-Fa-f0-9]+\]/g, '');
      attrs = attrs.replace(/text-white/g, '');
      attrs = attrs.replace(/\s+/g, ' ');
      return `${p1}${attrs}${p3}`;
    });
  });

  if (original !== content) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}

function walk(dir) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

walk(path.join(__dirname, 'src'));
