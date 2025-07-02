
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
function checkAccess(senderNumber, config) {
    if (!config || !config.bot) return false;
    
    const botMode = config.bot.mode || 'self';
    const ownerNumber = config.bot.owner || '';
    const botNumber = config.bot.botNumber || '';
    
    // Remove @s.whatsapp.net if present
    const cleanSender = senderNumber.replace('@s.whatsapp.net', '');
    const cleanOwner = ownerNumber.replace('@s.whatsapp.net', '');
    const cleanBot = botNumber.replace('@s.whatsapp.net', '');
    
    if (botMode === 'self') {
        // Only owner and bot number can use
        return cleanSender === cleanOwner || cleanSender === cleanBot;
    } else if (botMode === 'public') {
        // Everyone can use
        return true;
    }
    
    return false;
}

// Create ZIP backup of session folder
async function createSessionZip() {
    return new Promise((resolve, reject) => {
        const sessionPath = './sesi';
        const tempPath = './temp';
        
        // Create temp directory if it doesn't exist
        if (!fs.existsSync(tempPath)) {
            fs.mkdirSync(tempPath, { recursive: true });
        }
        
        const now = new Date();
        const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
        const timestamp = jakartaTime.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
        const zipFileName = `session_backup_${timestamp}.zip`;
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
        
        // Add all files from session directory
        if (fs.existsSync(sessionPath)) {
            archive.directory(sessionPath, 'sesi');
        }
        
        // Add config.json if exists
        if (fs.existsSync('./config.json')) {
            archive.file('./config.json', { name: 'config.json' });
        }
        
        archive.finalize();
    });
}

// Get session statistics
function getSessionStats() {
    const sessionPath = './sesi';
    if (!fs.existsSync(sessionPath)) {
        return { totalFiles: 0, totalSize: 0, fileTypes: {} };
    }
    
    const files = fs.readdirSync(sessionPath);
    let totalSize = 0;
    const fileTypes = {};
    
    files.forEach(file => {
        const filePath = path.join(sessionPath, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        
        const ext = path.extname(file).toLowerCase() || 'no-ext';
        fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    });
    
    return {
        totalFiles: files.length,
        totalSize: totalSize,
        fileTypes: fileTypes
    };
}

async function sendSessionBackup(client, msg) {
    try {
        const config = loadConfig();
        if (!config) return;

        // Get sender number
        const senderNumber = msg.key.participant || msg.key.remoteJid;
        const cleanSender = senderNumber.replace('@s.whatsapp.net', '');
        
        // Check access permission
        if (!checkAccess(senderNumber, config)) {
            return; // Tidak ada respon jika tidak memiliki akses
        }

        // Check if session directory exists
        const sessionPath = './sesi';
        if (!fs.existsSync(sessionPath)) {
            const errorMessage = `╭━━━『 ❌ BACKUP SESSION GAGAL 』━━━❀
┃ 
┃ ❌ *Folder Session Tidak Ditemukan!*
┃ 
┃ 📂 *Path:* ./sesi/
┃ ⚠️  *Status:* Session belum tersedia atau terhapus
┃ 
┃ 💡 *Solusi:*
┃ ▫️ Pastikan bot sudah login
┃ ▫️ Coba restart bot jika perlu
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀`;

            return await client.sendMessage(msg.key.remoteJid, { text: errorMessage }, { quoted: msg });
        }

        // Send processing message first
        const processingMsg = `╭━━━『 🔄 MEMPROSES BACKUP 』━━━❀
┃ 
┃ ⏳ *Sedang Membuat Backup ZIP...*
┃ 
┃ 🔧 *Proses:*
┃ ▫️ Mengompres folder session
┃ ▫️ Mengumpulkan file konfigurasi
┃ ▫️ Mempersiapkan pengiriman
┃ 
┃ ⚡ *Mohon tunggu sebentar...*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀`;

        await client.sendMessage(msg.key.remoteJid, { text: processingMsg }, { quoted: msg });

        // Get target number from config
        const targetNumber = config.backupTarget || config.bot.owner || '6289688206739';
        const targetJid = targetNumber.includes('@') ? targetNumber : `${targetNumber}@s.whatsapp.net`;

        // Get session statistics
        const sessionStats = getSessionStats();
        
        // Create ZIP backup
        const zipInfo = await createSessionZip();

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

        // Create success message with enhanced design
        const successMessage = `╭━━━『 📦 SESSION BACKUP BERHASIL 』━━━❀
┃ 
┃ ✅ *ZIP Backup Berhasil Dikirim!*
┃ 
┃ 📅 *Informasi Waktu*
┃ ▫️ Tanggal: ${dayName}, ${date} ${monthName} ${year}
┃ ▫️ Waktu: ${time} WIB 🇮🇩
┃ ▫️ Timezone: Asia/Jakarta
┃ 
┃ 🤖 *Status Bot* (Config.json)
┃ ▫️ Mode: ${config.bot.mode.toUpperCase()} ${config.bot.mode === 'self' ? '🔒' : '🌐'}
┃ ▫️ Prefix: ${config.bot.prefix}
┃ ▫️ Owner: ${sensorNumber(config.bot.owner)}
┃ ▫️ Bot Number: ${sensorNumber(config.bot.botNumber)}
┃ ▫️ Status: Online ✅
┃ 
┃ 📊 *Statistik Session*
┃ ▫️ Total File: ${sessionStats.totalFiles} file
┃ ▫️ Total Size: ${formatFileSize(sessionStats.totalSize)}
┃ ▫️ JSON Files: ${sessionStats.fileTypes['.json'] || 0}
┃ ▫️ Other Files: ${sessionStats.totalFiles - (sessionStats.fileTypes['.json'] || 0)}
┃ 
┃ 📦 *Detail ZIP Backup*
┃ ▫️ Filename: ${zipInfo.filename}
┃ ▫️ ZIP Size: ${formatFileSize(zipInfo.size)}
┃ ▫️ Compression: ✅ Maximum Level
┃ ▫️ Contents: Session + Config
┃ 
┃ 📤 *Target Backup*
┃ ▫️ Tujuan: ${sensorNumber(targetNumber)}
┃ ▫️ Status: Terkirim ✅
┃ ▫️ Format: ZIP Archive 📦
┃ 
┃ 🔐 *Akses Control*
┃ ▫️ Requester: ${sensorNumber(cleanSender)}
┃ ▫️ Mode: ${config.bot.mode} ${config.bot.mode === 'self' ? '(Terbatas 🔒)' : '(Publik 🌐)'}
┃ ▫️ Authorization: ✅ Verified
┃ 
┃ ⚡ *System Performance*
┃ ▫️ Backup Process: 100% Complete 💚
┃ ▫️ ZIP Creation: Success ✅
┃ ▫️ File Transfer: Optimal ⚡
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

🚀 *ZIP backup berhasil dikirim ke ${sensorNumber(targetNumber)}!*
📦 *Semua file session telah dikompres dengan aman*`;

        // Caption for the ZIP file
        const zipCaption = `╭━━━『 📦 WhatsApp Bot Session Backup 』━━━❀
┃ 
┃ 🤖 *Bot Session ZIP Backup*
┃ 
┃ 📅 *Backup Info*
┃ ▫️ Tanggal: ${dayName}, ${date} ${monthName} ${year}
┃ ▫️ Waktu: ${time} WIB 🇮🇩
┃ ▫️ Filename: ${zipInfo.filename}
┃ ▫️ Size: ${formatFileSize(zipInfo.size)}
┃ 
┃ 📊 *Contents*
┃ ▫️ Session Files: ${sessionStats.totalFiles} files
┃ ▫️ Config File: ✅ Included
┃ ▫️ Total Data: ${formatFileSize(sessionStats.totalSize)}
┃ ▫️ Compression: Maximum Level
┃ 
┃ 🔐 *Security*
┃ ▫️ Requester: ${sensorNumber(cleanSender)}
┃ ▫️ Bot Mode: ${config.bot.mode.toUpperCase()}
┃ ▫️ Bot Number: ${sensorNumber(config.bot.botNumber)}
┃ ▫️ Authorization: ✅ Verified
┃ 
┃ ⚠️  *PENTING:*
┃ ▫️ File ini berisi data sensitif bot
┃ ▫️ Simpan dengan aman dan jangan bagikan
┃ ▫️ Gunakan untuk restore session
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

🔒 *Backup Session ZIP - Handle with Care!*`;

        // Send backup image first (thumbnail)
        const backupImage = 'https://files.catbox.moe/9cq0yk.jpg'; // You can change this URL
        
        await client.sendMessage(targetJid, {
            image: { url: backupImage },
            caption: `╭━━━『 📦 SESSION BACKUP INCOMING 』━━━❀
┃ 
┃ 🚀 *ZIP Backup Ready!*
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
        // Try to send with local animated GIF
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
                            newsletterName: `📦 ${selectedFileName.charAt(0).toUpperCase() + selectedFileName.slice(1)} Session Backup`,
                            newsletterJid: "120363312297133690@newsletter",
                        },
                        externalAdReply: {
                            showAdAttribution: true,
                            title: `📦 ${senderName}`,
                            body: `Session Backup • ${selectedFileName} • ${formattedDate}`,
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
                            newsletterName: "📦 Session Backup System",
                            newsletterJid: "120363312297133690@newsletter",
                        },
                        externalAdReply: {
                            showAdAttribution: true,
                            title: `📦 ${senderName}`,
                            body: `Session Backup • ${formattedDate}`,
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
        const errorMessage = `╭━━━『 ❌ BACKUP SESSION GAGAL 』━━━❀
┃ 
┃ ❌ *Terjadi Kesalahan!*
┃ 
┃ 🔍 *Detail Error:*
┃ ▫️ ${error.message || 'Unknown error'}
┃ 
┃ 💡 *Solusi:*
┃ ▫️ Periksa folder session
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

function handleBackupCommand(client, msg) {
    const config = loadConfig();
    if (!config) return;

    const senderNumber = msg.key.participant || msg.key.remoteJid;
    
    // Check access permission first
    if (!checkAccess(senderNumber, config)) {
        return; // Tidak ada respon untuk yang tidak berhak akses
    }

    const messageText = msg.message?.conversation?.toLowerCase() || 
                       msg.message?.extendedTextMessage?.text?.toLowerCase() || '';
    
    // Check for backup commands
    if (messageText === '.backupsesi' || messageText === '.backup' || messageText === '.getsesi') {
        sendSessionBackup(client, msg);
    }
}

module.exports = {
    sendSessionBackup,
    handleBackupCommand
};
