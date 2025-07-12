
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { Wily } from '../../CODE_REPLY/reply.js';

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
    if (!config) return false;

    const botMode = config.mode || 'self';
    const ownerNumbers = config.OWNER || [];
    
    // Remove @s.whatsapp.net if present
    const cleanSender = senderNumber.replace('@s.whatsapp.net', '');
    
    if (botMode === 'self') {
        // Only owner and fromMe can use
        return fromMe || ownerNumbers.includes(cleanSender);
    } else if (botMode === 'public') {
        // Only owner can use this command even in public mode
        return ownerNumbers.includes(cleanSender);
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
        try {
            const existingFiles = fs.readdirSync(tempPath).filter(file => 
                file.startsWith('WilyKun_Source_V') && file.endsWith('.zip')
            );

            if (existingFiles.length > 0) {
                const versions = existingFiles.map(file => {
                    const match = file.match(/V(\d+)_/);
                    return match ? parseInt(match[1]) : 0;
                });
                versionNumber = Math.max(...versions) + 1;
            }
        } catch (error) {
            // If can't read temp directory, just use version 1
        }

        const now = new Date();
        const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
        const dateStr = jakartaTime.toLocaleDateString('id-ID').replace(/\//g, '-');
        const timeStr = jakartaTime.toLocaleTimeString('id-ID', { hour12: false }).replace(/:/g, '');

        const zipFileName = `WilyKun_Source_V${versionNumber}_${dateStr}_${timeStr}.zip`;
        const zipPath = path.join(tempPath, zipFileName);

        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 5 },
            gzip: false,
            statConcurrency: 1,
            store: false
        });

        // Timeout handler
        const timeout = setTimeout(() => {
            archive.abort();
            reject(new Error('Source code backup timeout - process took too long'));
        }, 120000); // 2 minute timeout

        output.on('close', () => {
            clearTimeout(timeout);
            resolve({
                path: zipPath,
                filename: zipFileName,
                size: archive.pointer()
            });
        });

        archive.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });

        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                // Silent warning
            } else {
                clearTimeout(timeout);
                reject(err);
            }
        });

        archive.pipe(output);

        // Priority files and directories
        const priorityFiles = ['package.json', 'config.json', 'index.js', 'hisoka.js', 'message.js'];
        const priorityDirs = ['WILY_KUN', 'CODE_REPLY', 'lib'];

        // Skip these directories
        const excludeDirs = ['node_modules', 'temp', 'session', '.git', 'coverage', 'dist', 'build', 'attached_assets'];
        const allowedExtensions = ['.js', '.json', '.md', '.txt'];

        // Add files to archive
        const addToArchive = (currentPath, archivePath = '', depth = 0) => {
            if (depth > 10) return;

            try {
                const items = fs.readdirSync(currentPath);

                // Process priority files first
                items.forEach(item => {
                    if (priorityFiles.includes(item)) {
                        const fullPath = path.join(currentPath, item);
                        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                            archive.file(fullPath, { name: archivePath ? path.join(archivePath, item) : item });
                        }
                    }
                });

                // Process directories and other files
                items.forEach(item => {
                    if (priorityFiles.includes(item)) return;

                    const fullPath = path.join(currentPath, item);
                    const relativePath = archivePath ? path.join(archivePath, item) : item;

                    if (excludeDirs.includes(item)) return;

                    if (item.startsWith('.') || item.includes('~') || 
                        item.endsWith('.bak') || item.endsWith('.tmp') ||
                        item.endsWith('.log') || item.endsWith('.backup')) return;

                    try {
                        const stats = fs.statSync(fullPath);

                        if (stats.isDirectory()) {
                            if (priorityDirs.includes(item) || depth < 3) {
                                addToArchive(fullPath, relativePath, depth + 1);
                            }
                        } else {
                            const ext = path.extname(item).toLowerCase();
                            if (allowedExtensions.includes(ext) && stats.size < 5 * 1024 * 1024) {
                                archive.file(fullPath, { name: relativePath });
                            }
                        }
                    } catch (error) {
                        // Skip files that can't be accessed
                    }
                });
            } catch (error) {
                // Skip directories that can't be read
            }
        };

        addToArchive('./');

        setTimeout(() => {
            archive.finalize();
        }, 100);
    });
}

// Get source code statistics
function getSourceCodeStats() {
    let totalFiles = 0;
    let totalFolders = 0;
    let totalSize = 0;
    const fileTypes = {};

    const excludeDirs = ['node_modules', 'temp', 'session', '.git', 'coverage', 'dist', 'build', 'attached_assets'];
    const allowedExtensions = ['.js', '.json', '.md', '.txt'];

    const countFiles = (dirPath, relativePath = '') => {
        if (!fs.existsSync(dirPath)) return;

        const items = fs.readdirSync(dirPath);

        items.forEach(item => {
            const fullPath = path.join(dirPath, item);

            try {
                const stats = fs.statSync(fullPath);

                if (stats.isDirectory()) {
                    if (!excludeDirs.includes(item) && !item.startsWith('.')) {
                        totalFolders++;
                        countFiles(fullPath, relativePath ? path.join(relativePath, item) : item);
                    }
                } else {
                    if (item.startsWith('.') && !['.gitignore', '.replit'].includes(item)) return;

                    if (item.endsWith('.bak') || item.endsWith('.backup') || 
                        item.endsWith('.old') || item.endsWith('.orig') ||
                        item.includes('~') || item.startsWith('#')) {
                        return;
                    }

                    const ext = path.extname(item).toLowerCase();
                    if (allowedExtensions.includes(ext) || item === 'README' || item === 'LICENSE') {
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
        totalFolders,
        totalSize,
        fileTypes
    };
}

// Send source code backup
async function sendSourceCodeBackup(hisoka, m) {
    try {
        const config = loadConfig();
        if (!config) return;

        // Get sender number
        const senderNumber = m.key.participant || m.key.remoteJid;
        const cleanSender = senderNumber.replace('@s.whatsapp.net', '');
        const fromMe = m.key.fromMe || false;

        // Check access permission
        if (!checkAccess(senderNumber, config, fromMe)) {
            return; // Silent return for unauthorized users
        }

        // Send processing message first
        const processingMsg = `╭━━━『 🔄 MEMPROSES BACKUP SOURCE CODE 』━━━❀
┃ 
┃ ⏳ *Sedang Membuat Backup ZIP...*
┃ 
┃ 🔧 *Proses OPTIMIZED:*
┃ ▫️ Scanning priority files... 📂
┃ ▫️ Kompresi level 5 (balanced) 🗜️
┃ ▫️ Filter ekstensi (.js/.json/.md) ⚡
┃ ▫️ Skip folder berat (node_modules) 🚀
┃ ▫️ Limit file size max 5MB 📏
┃ 
┃ ⚡ *Estimasi: 60-120 detik*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀`;

        await Wily(processingMsg, m, hisoka);

        // Target number for backup - first owner in config
        const targetNumber = config.OWNER[0] || '6282263096788';
        const targetJid = targetNumber.includes('@') ? targetNumber : `${targetNumber}@s.whatsapp.net`;

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

        // Caption for the ZIP file
        const zipCaption = `╭━━━『 📦 WilyKun Bot Source Code Backup 』━━━❀
┃ 
┃ 🤖 *Bot Source Code ZIP Backup*
┃ 
┃ 📅 *Backup Info*
┃ ▫️ Tanggal: ${dayName}, ${date} ${monthName} ${year}
┃ ▫️ Waktu: ${time} WIB 🇮🇩
┃ ▫️ Size: ${formatFileSize(zipInfo.size)}
┃ 
┃ 📊 *Contents*
┃ ▫️ Source Files: ${sourceStats.totalFiles} files
┃ ▫️ Source Folders: ${sourceStats.totalFolders} folders
┃ ▫️ Config File: ✅ Included
┃ ▫️ Total Data: ${formatFileSize(sourceStats.totalSize)}
┃ ▫️ Compression: Level 5
┃ 
┃ 🔐 *Security*
┃ ▫️ Requester: ${sensorNumber(cleanSender)}
┃ ▫️ Bot Mode: ${config.mode.toUpperCase()}
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

        // Send ZIP file
        await hisoka.sendMessage(targetJid, {
            document: fs.readFileSync(zipInfo.path),
            fileName: zipInfo.filename,
            mimetype: 'application/zip',
            caption: zipCaption
        });

        // Create success message
        const successMessage = `╭━━━『 📦 SOURCE CODE BACKUP BERHASIL 』━━━❀
┃ 
┃ ✅ *ZIP Source Code Berhasil Dikirim!*
┃ 
┃ 📅 *Informasi Waktu*
┃ ▫️ Tanggal: ${dayName}, ${date} ${monthName} ${year}
┃ ▫️ Waktu: ${time} WIB 🇮🇩
┃ ▫️ Timezone: Asia/Jakarta
┃ 
┃ 🤖 *Status Bot*
┃ ▫️ Mode: ${config.mode.toUpperCase()} ${config.mode === 'self' ? '🔒' : '🌐'}
┃ ▫️ Owner: ${sensorNumber(config.OWNER[0])}
┃ ▫️ Status: Online ✅
┃ 
┃ 📊 *Statistik Source Code*
┃ ▫️ Total File: ${sourceStats.totalFiles} files
┃ ▫️ Total Folder: ${sourceStats.totalFolders} folders
┃ ▫️ Total Size: ${formatFileSize(sourceStats.totalSize)}
┃ ▫️ JavaScript Files: ${sourceStats.fileTypes['.js'] || 0}
┃ ▫️ JSON Files: ${sourceStats.fileTypes['.json'] || 0}
┃ ▫️ Markdown Files: ${sourceStats.fileTypes['.md'] || 0}
┃ 
┃ 📦 *Detail ZIP Backup*
┃ ▫️ ZIP Size: ${formatFileSize(zipInfo.size)}
┃ ▫️ Compression: ✅ Level 5
┃ ▫️ Contents: Complete Source Code
┃ 
┃ 📤 *Target Backup*
┃ ▫️ Tujuan: ${sensorNumber(targetNumber)}
┃ ▫️ Status: Terkirim ✅
┃ ▫️ Format: ZIP Archive
┃ 
┃ 🔐 *Akses Control*
┃ ▫️ Requester: ${sensorNumber(cleanSender)}
┃ ▫️ Mode: ${config.mode} ${config.mode === 'self' ? '(Terbatas 🔒)' : '(Publik 🌐)'}
┃ ▫️ Authorization: ✅ Verified
┃ ▫️ From Me: ${fromMe ? '✅ Yes' : '❌ No'}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

🚀 *ZIP source code berhasil dikirim ke ${sensorNumber(targetNumber)}!*`;

        // Send confirmation to requester
        await Wily(successMessage, m, hisoka);

        // Clean up temporary ZIP file
        setTimeout(() => {
            try {
                if (fs.existsSync(zipInfo.path)) {
                    fs.unlinkSync(zipInfo.path);
                }
            } catch (e) {
                // Silent cleanup error
            }
        }, 5000);

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
            await Wily(errorMessage, m, hisoka);
        } catch (e) {
            // Silent error
        }
    }
}

// Handle backup source code command
export async function handleBackupSourceCodeCommand(m, { hisoka, text, command }) {
    try {
        const config = loadConfig();
        if (!config) return;

        const senderNumber = m.sender.split('@')[0];
        const fromMe = m.key.fromMe || false;

        // Check access permission
        if (!checkAccess(m.sender, config, fromMe)) {
            return; // Silent return for unauthorized users
        }

        // Check for backup source code command
        if (command === 'backupsc') {
            await sendSourceCodeBackup(hisoka, m);
        }

    } catch (error) {
        // Silent error handling
    }
}

// Export for message.js
export const backupscInfo = {
    command: ['backupsc'],
    description: 'Backup source code ke ZIP file dan kirim ke owner'
};

// Export main function
export const backupsc = handleBackupSourceCodeCommand;
