const fs = require('fs');
const path = require('path');

const directories = [path.join(__dirname, 'components'), __dirname];
const filesToProcess = [];

function findFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist') {
                findFiles(fullPath);
            }
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            filesToProcess.push(fullPath);
        }
    }
}

findFiles(directories[0]);
// Add App.tsx specifically
if (fs.existsSync(path.join(__dirname, 'App.tsx'))) {
    filesToProcess.push(path.join(__dirname, 'App.tsx'));
}

let modifiedCount = 0;

for (const file of filesToProcess) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Rule 1: Replace main container borders with shadows
    // bg-[#001645] border border-[#002266] -> bg-[#001645] shadow-2xl
    // We only replace if it's not an input field. We'll rely on text replacement.
    // However, since some buttons might be like bg-[#000F33] hover:bg-[#001645], we'll be careful.
    
    // We can confidently remove `border border-[#002266]` from general `bg-` containers
    // But let's check if the line contains `<input`, if so, skip border removal for that line
    
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip input and textarea elements
        if (line.includes('<input') || line.includes('<textarea') || line.includes('type="text"')) {
            continue; 
        }

        // Replace border border-[#002266] with nothing, often near backgrounds
        let newLine = line.replace(/border border-\[\#002266\]/g, '');
        
        // Also remove `border-t border-[#002266]` if they are too harsh
        // Actually, dividers are okay, but let's make them softer: border-white/5
        newLine = newLine.replace(/border-t border-\[\#002266\]/g, 'border-t border-white/5');
        newLine = newLine.replace(/border-b border-\[\#002266\]/g, 'border-b border-white/5');
        newLine = newLine.replace(/border-l border-\[\#002266\]/g, 'border-l border-white/5');
        newLine = newLine.replace(/border-r border-\[\#002266\]/g, 'border-r border-white/5');

        // Cleanup multiple spaces
        newLine = newLine.replace(/\s+/g, ' ').replace(/ "/g, '"').replace(/" /g, '"');
        
        lines[i] = newLine;
    }
    
    content = lines.join('\n');
    
    // Some components have border-2 border-[#002266] (like AvatarBuilder)
    // We keep these or make them border-white/5
    content = content.replace(/border-2 border-\[\#002266\]/g, 'border-2 border-white/5');
    content = content.replace(/border-4 border-\[\#002266\]/g, 'border-4 border-white/5');
    // Remove standalone `border-[#002266]` if it's paired with just `border`
    content = content.replace(/className="(.*?)\bborder\b(.*?)\bborder-\[\#002266\](.*?)"/g, 'className="$1$2$3"');

    if (original !== content) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
        console.log(`Modified: ${path.basename(file)}`);
    }
}

console.log(`Processed ${filesToProcess.length} files. Modified ${modifiedCount} files.`);
