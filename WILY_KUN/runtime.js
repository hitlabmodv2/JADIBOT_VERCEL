
const fs = require('fs');
const path = require('path');
const os = require('os');

// Import fungsi ReplyRynzz dari MENU
const { ReplyRynzz } = require('../MENU/MENU.js');

// Import fungsi loadConfig dari Wilykun.js
const { loadConfig } = require('../Wilykun.js');

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(uptime) {
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);
    const seconds = Math.floor(uptime % 60);

    let result = '';
    if (days > 0) result += `${days} hari `;
    if (hours > 0) result += `${hours} jam `;
    if (minutes > 0) result += `${minutes} menit `;
    result += `${seconds} detik`;

    return result.trim();
}

function getTimeSession() {
    const hour = new Date().toLocaleString('en-US', { 
        timeZone: 'Asia/Jakarta',
        hour: 'numeric',
        hour12: false
    });
    const hourNum = parseInt(hour);
    
    if (hourNum >= 0 && hourNum < 4) return "🌙 Tengah Malam";
    if (hourNum >= 4 && hourNum < 10) return "🌅 Pagi";
    if (hourNum >= 10 && hourNum < 15) return "☀️ Siang";
    if (hourNum >= 15 && hourNum < 18) return "🌤️ Sore";
    return "🌜 Malam";
}

function getCurrentTimeInfo() {
    const currentTime = new Date();
    
    // Get Jakarta time information
    const jakartaTime = currentTime.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const hari = currentTime.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long'
    });

    const tanggal = currentTime.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric'
    });

    const bulan = currentTime.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        month: 'long'
    });

    const tahun = currentTime.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric'
    });

    const runtime = formatUptime(process.uptime());
    const selamat = getTimeSession();

    return {
        jakartaTime,
        hari,
        tanggal,
        bulan,
        tahun,
        runtime,
        selamat
    };
}

async function handleRuntimeCommand(sock, msg) {
    try {
        // Load config untuk cek mode dan owner
        const config = loadConfig();
        
        // Get sender info
        const senderJid = msg.key.remoteJid;
        const botNumber = sock.user?.id?.split(':')[0];
        
        let actualSenderNumber;
        if (msg.key.participant) {
            actualSenderNumber = msg.key.participant.split('@')[0];
        } else if (msg.key.fromMe) {
            actualSenderNumber = botNumber;
        } else {
            actualSenderNumber = senderJid?.split('@')[0];
        }

        // Check mode access - fitur ini bisa digunakan semua orang (no access restriction)
        // Tapi tetap respect mode bot untuk response
        if (config.bot?.mode === 'self') {
            const isFromMe = msg.key.fromMe === true;
            const isBotNumber = actualSenderNumber === botNumber;
            const isOwnerNumber = actualSenderNumber === config.bot?.owner;
            const isBotNumberFromConfig = actualSenderNumber === config.bot?.botNumber;
            const isHardcodedBot = actualSenderNumber === '6289681008411';

            const isAuthorizedUser = isFromMe || isBotNumber || isOwnerNumber || isBotNumberFromConfig || isHardcodedBot;

            if (!isAuthorizedUser) {
                // Dalam mode self, bot tidak akan merespon untuk user yang tidak authorized
                return;
            }
        }

        // Get time information
        const timeInfo = getCurrentTimeInfo();
        
        // Get system information
        const startTime = Date.now();
        const memoryUsage = process.memoryUsage();
        const nodeVersion = process.version;
        const platform = process.platform;
        const arch = process.arch;
        
        // Get server memory info
        const freeMemory = os.freemem();
        const totalMemory = os.totalmem();
        const usedMemory = totalMemory - freeMemory;
        const memoryPercentage = ((usedMemory / totalMemory) * 100).toFixed(1);
        
        // Get CPU info
        const cpuCount = os.cpus().length;
        const cpuModel = os.cpus()[0].model;
        const loadAvg = os.loadavg();
        
        // Get bot stats
        let totalMessages = 0;
        try {
            const statusDataPath = path.join(process.cwd(), 'DATA', 'status_data.json');
            if (fs.existsSync(statusDataPath)) {
                const statusData = JSON.parse(fs.readFileSync(statusDataPath, 'utf8'));
                totalMessages = Object.keys(statusData).length || 0;
            }
        } catch (error) {
            // Silent error
        }

        // Get session files count
        let sessionFiles = 0;
        try {
            const sessionDir = path.join(process.cwd(), 'sesi');
            if (fs.existsSync(sessionDir)) {
                sessionFiles = fs.readdirSync(sessionDir).length;
            }
        } catch (error) {
            // Silent error
        }

        // Get video collection info
        let totalVideos = 0;
        let selectedFileName = 'default-anime';
        try {
            const videoFolder = path.join(__dirname, '../VID_GIF_ANIME');
            if (fs.existsSync(videoFolder)) {
                const videoFiles = fs.readdirSync(videoFolder).filter(file => {
                    const ext = path.extname(file).toLowerCase();
                    return ['.mp4', '.gif', '.webm', '.mov', '.avi'].includes(ext);
                });
                totalVideos = videoFiles.length;
                
                if (videoFiles.length > 0) {
                    const randomIndex = Math.floor(Math.random() * videoFiles.length);
                    const selectedFile = videoFiles[randomIndex];
                    selectedFileName = path.basename(selectedFile, path.extname(selectedFile));
                }
            }
        } catch (error) {
            // Silent error
        }

        // Calculate ping and health score
        const responseTime = Date.now() - startTime;
        const healthScore = Math.min(100, Math.max(0, 
            100 - (parseFloat(memoryPercentage) * 0.5) - (loadAvg[0] * 10)
        )).toFixed(1);

        // Get emoji berdasarkan waktu
        let timeEmoji = '🕐';
        const hour = parseInt(new Date().toLocaleString('en-US', { 
            timeZone: 'Asia/Jakarta',
            hour: 'numeric',
            hour12: false
        }));
        
        if (hour >= 0 && hour < 4) timeEmoji = '🌙';
        else if (hour >= 4 && hour < 10) timeEmoji = '🌅';
        else if (hour >= 10 && hour < 15) timeEmoji = '☀️';
        else if (hour >= 15 && hour < 18) timeEmoji = '🌤️';
        else timeEmoji = '🌜';

        // Build runtime information text
        const runtimeText = `
🤖 *INFORMASI RUNTIME BOT* 🤖
✨ WilyKun Premium Edition ✨

${timeEmoji} *WAKTU & TANGGAL*
📅 Hari      : ${timeInfo.hari}
📆 Tanggal   : ${timeInfo.tanggal}
🗓️ Bulan     : ${timeInfo.bulan}
🎯 Tahun     : ${timeInfo.tahun}
⏰ Runtime   : ${timeInfo.runtime}
🌟 Selamat   : ${timeInfo.selamat}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 *BOT INFORMATION*
🟢 Status       : Online & Running ✅
📱 Bot Number   : ${config.bot?.botNumber || botNumber || 'Unknown'}
👑 Owner        : ${config.bot?.owner || 'Not Set'}
🔧 Mode         : ${config.bot?.mode?.toUpperCase() || 'PUBLIC'}
⚡ Prefix       : ${config.bot?.prefix || '.'}
📊 Stories Read : ${totalMessages} story
🏓 Ping         : ${responseTime}ms
💚 Health Score : ${healthScore}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🖥️ *SYSTEM INFORMATION*
💻 Platform     : ${platform.toUpperCase()} (${arch})
🔥 Node.js      : ${nodeVersion}
🧠 CPU Model    : ${cpuModel.split(' ').slice(0, 2).join(' ')}
⚙️ CPU Cores    : ${cpuCount} Core${cpuCount > 1 ? 's' : ''}
📈 Load Average : ${loadAvg[0].toFixed(2)}
🌐 Hostname     : ${os.hostname()}
🔧 Process ID   : ${process.pid}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 *MEMORY USAGE*
🎯 RAM Used     : ${formatBytes(memoryUsage.rss)}
📊 Heap Used    : ${formatBytes(memoryUsage.heapUsed)}
📈 Heap Total   : ${formatBytes(memoryUsage.heapTotal)}
🔍 External     : ${formatBytes(memoryUsage.external)}
🖥️ System RAM   : ${formatBytes(usedMemory)} / ${formatBytes(totalMemory)}
📊 RAM Usage    : ${memoryPercentage}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 *BOT FEATURES STATUS*
🎭 Auto Reaction  : ${config.autoReactionStory?.enabled ? (config.autoReactionStory.mode === 'always' ? 'ALWAYS ON 🔥' : config.autoReactionStory.mode.toUpperCase() + ' ✅') : 'OFF ❌'}
⌨️ Auto Typing    : ${config.autoFeatures?.typing ? 'ON ✅' : 'OFF ❌'}
🎙️ Auto Recording : ${config.autoFeatures?.recording ? 'ON ✅' : 'OFF ❌'}
🟢 Auto Online    : ${config.autoFeatures?.online ? 'ON ✅' : 'OFF ❌'}
🛡️ Anti Delete    : ${config.autoFeatures?.antidelete ? 'ON ✅' : 'OFF ❌'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *DATA & FILES*
📁 Session Files  : ${sessionFiles} files
🎞️ Anime Videos   : ${totalVideos} video${totalVideos !== 1 ? 's' : ''}
🎬 Current Anime  : ${selectedFileName}
📋 Config Status  : ${fs.existsSync('./config.json') ? 'OK ✅' : 'Missing ❌'}
💾 Backup Status  : ${fs.existsSync('./DATA/config.backup.json') ? 'Available ✅' : 'None ❌'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 *NETWORK & CONNECTION*
📡 WhatsApp       : Connected ✅
🌍 Internet       : Stable 🟢
⚡ Response Time  : ${responseTime}ms
🔗 Protocol       : WebSocket
📍 Server         : Replit Infrastructure

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 *Bot berjalan dengan sempurna!*
✨ Semua sistem operasional dan siap digunakan
💎 Premium Edition by WilyKun`;

        // Send response using ReplyRynzz dengan video random
        await ReplyRynzz(sock, msg, runtimeText, null, { 
            useRandomVideo: true,
            packname: "Runtime Information",
            author: 'WilyKun Bot'
        });

    } catch (error) {
        // Error fallback tanpa log console
        const errorText = `❌ *ERROR RUNTIME*\n\nTerjadi kesalahan saat mengambil informasi runtime.\nSilakan coba lagi dalam beberapa saat.`;
        
        try {
            await ReplyRynzz(sock, msg, errorText, null, {
                packname: "Error Handler",
                author: 'WilyKun Bot'
            });
        } catch (fallbackError) {
            // Silent fallback error
        }
    }
}

module.exports = {
    handleRuntimeCommand
};
