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

  // 1. Replace button usages of bg-chrome-prismatic
  content = content.replace(/(<(?:Link|button)[^>]*?className="[^"]*?)bg-chrome-prismatic([^"]*?"[^>]*?>)/g, '$1btn-chrome-prismatic$2');
  
  // 2. Process icons
  icons.forEach(icon => {
    // Regex to match <IconName ... /> or <IconName ...>
    const regex = new RegExp(`(<${icon}\\s+)([^>]*?)(/?>)`, 'g');
    content = content.replace(regex, (match, p1, p2, p3) => {
      let attrs = p2;
      // Remove text-color classes
      attrs = attrs.replace(/\btext-(?:white|\[(?:#?[A-Fa-f0-9]+|var\([^)]+\))\]|[a-z]+-\d+)\b/g, '');
      // Clean up multiple spaces
      attrs = attrs.replace(/\s+/g, ' ');
      
      // Check if style already exists
      if (attrs.includes('style={{')) {
        attrs = attrs.replace(/style={{(.*?)(stroke:\s*[^,}]+)?(,*)(.*?)}}/, 'style={{$1 stroke: "url(#icon-gold-gradient)",$4}}');
      } else {
        attrs += ` style={{ stroke: "url(#icon-gold-gradient)", strokeWidth: 1.5 }}`;
      }
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
