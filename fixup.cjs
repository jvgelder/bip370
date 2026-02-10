#!/usr/bin/env node
/**
 * Post-build script to fix CommonJS module references
 * Changes .js imports to .cjs in the CJS build output
 */
const fs = require('fs');
const path = require('path');

const cjsDir = path.join(__dirname, 'src', 'cjs');

function fixImports(dir) {
    if (!fs.existsSync(dir)) {
        return;
    }

    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            fixImports(filePath);
        } else if (file.endsWith('.cjs')) {
            let content = fs.readFileSync(filePath, 'utf8');

            // Fix require statements: require("./foo.js") -> require("./foo.cjs")
            content = content.replace(
                /require\("(\.[^"]+)\.js"\)/g,
                'require("$1.cjs")'
            );

            // Fix relative imports that might not have .js extension
            content = content.replace(
                /require\("(\.\.?\/[^"]+)"\)/g,
                (match, p1) => {
                    if (p1.endsWith('.cjs') || p1.endsWith('.json')) {
                        return match;
                    }
                    return `require("${p1}.cjs")`;
                }
            );

            fs.writeFileSync(filePath, content);
        }
    }
}

fixImports(cjsDir);
console.log('Fixed CJS imports');
