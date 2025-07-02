const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const execPromise = util.promisify(exec);

// Load config function
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
    } catch (error) {
        // Silent error
    }
    return {
        bot: { mode: 'public', prefix: '.', owner: '', botNumber: '' }
    };
}

// Fungsi untuk mengirim pesan dengan quote menggunakan CODE_REPLAY
async function sendQuotedReply(sock, msg, text) {
    try {
        const { ReplyRynzz } = require('../CODE_REPLAY/reply.js');
        await ReplyRynzz(sock, msg, text);
    } catch (error) {
        // Fallback ke sendMessage biasa
        await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
    }
}

// Handler untuk command hdvid
async function handleHdVidCommand(sock, msg) {
    try {
        // Load config untuk cek mode
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

        // Check mode access
        if (config.bot?.mode === 'self') {
            const isFromMe = msg.key.fromMe === true;
            const isBotNumber = actualSenderNumber === botNumber;
            const isOwnerNumber = actualSenderNumber === config.bot?.owner;
            const isBotNumberFromConfig = actualSenderNumber === config.bot?.botNumber;

            const isAuthorizedUser = isFromMe || isBotNumber || isOwnerNumber || isBotNumberFromConfig;

            if (!isAuthorizedUser) {
                return;
            }
        }

        // Check apakah ada video yang bisa diproses dulu sebelum show help
        let hasVideoToProcess = false;

        // Cek video di pesan saat ini (dengan caption .hdvid)
        if (msg.message?.videoMessage) {
            hasVideoToProcess = true;
        }

        // Cek video di pesan yang dikutip
        else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage) {
            hasVideoToProcess = true;
        }

        // Hanya show help jika tidak ada video yang bisa diproses
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || '';

        if (messageText.trim() === `${config.bot.prefix}hdvid` && !hasVideoToProcess) {
            const helpText = `
🎬 *HD VIDEO ENHANCEMENT*

📝 *Cara penggunaan:*
• Kirim video dengan caption: ${config.bot.prefix}hdvid
• Reply video dengan: ${config.bot.prefix}hdvid

🎥 *Fitur:*
• Meningkatkan kualitas video
• Optimasi codec H.264
• Kompresi audio AAC 128k
• Format output MP4

⚙️ *Spesifikasi Output:*
├─ Codec Video: H.264 Baseline
├─ Level: 3.0
├─ Pixel Format: YUV420P
├─ Audio: AAC 128kbps
└─ Optimasi: Fast Start

⚠️ *Catatan:*
• Hanya support format video (MP4, AVI, MOV, dll)
• Ukuran file maksimal 50MB
• Proses membutuhkan waktu sesuai durasi video
• Video akan dioptimasi untuk streaming

🔧 *Tips:*
• Video pendek lebih cepat diproses
• Pastikan video tidak corrupt
• Format MP4 memberikan hasil terbaik

💡 *Contoh:*
[kirim video] + caption "${config.bot.prefix}hdvid"
Reply video lalu ketik "${config.bot.prefix}hdvid"`;

            await sendQuotedReply(sock, msg, helpText);
            return;
        }

        // Check apakah ada video yang bisa diproses
        let quotedMsg = null;
        let videoBuffer = null;

        // Cek apakah ada video di pesan yang dikutip
        if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
        }

        // Cek apakah ada video di pesan saat ini (dengan caption .hdvid)
        if (msg.message?.videoMessage) {
            try {
                videoBuffer = await sock.downloadMediaMessage(msg);

                if (!videoBuffer || videoBuffer.length === 0) {
                    const stream = await downloadContentFromMessage(msg.message.videoMessage, 'video');
                    const chunks = [];
                    for await (const chunk of stream) {
                        chunks.push(chunk);
                    }
                    videoBuffer = Buffer.concat(chunks);
                }
            } catch (error) {
                try {
                    const stream = await downloadContentFromMessage(msg.message.videoMessage, 'video');
                    const chunks = [];
                    for await (const chunk of stream) {
                        chunks.push(chunk);
                    }
                    videoBuffer = Buffer.concat(chunks);
                } catch (downloadError) {
                    await sendQuotedReply(sock, msg, `❌ Gagal mendownload video dari pesan ini

🔧 *Kemungkinan penyebab:*
• Format video tidak didukung
• File corrupt atau rusak
• Ukuran file terlalu besar

💡 *Solusi:*
• Coba kirim ulang video
• Gunakan format MP4, AVI, atau MOV
• Pastikan ukuran file di bawah 50MB`);
                    return;
                }
            }
        }
        // Cek apakah ada video di pesan yang dikutip
        else if (quotedMsg?.videoMessage) {
            try {
                const quotedKey = msg.message.extendedTextMessage.contextInfo.stanzaId;
                const quotedParticipant = msg.message.extendedTextMessage.contextInfo.participant;

                const tempMsg = {
                    key: {
                        remoteJid: senderJid,
                        fromMe: false,
                        id: quotedKey,
                        participant: quotedParticipant
                    },
                    message: { videoMessage: quotedMsg.videoMessage }
                };

                try {
                    videoBuffer = await sock.downloadMediaMessage(tempMsg);
                } catch (downloadError1) {
                    try {
                        const stream = await downloadContentFromMessage(quotedMsg.videoMessage, 'video');
                        const chunks = [];
                        for await (const chunk of stream) {
                            chunks.push(chunk);
                        }
                        videoBuffer = Buffer.concat(chunks);
                    } catch (downloadError2) {
                        const quotedMessage = msg.message.extendedTextMessage.contextInfo.quotedMessage;
                        if (quotedMessage && quotedMessage.videoMessage) {
                            const stream = await downloadContentFromMessage(quotedMessage.videoMessage, 'video');
                            const chunks = [];
                            for await (const chunk of stream) {
                                chunks.push(chunk);
                            }
                            videoBuffer = Buffer.concat(chunks);
                        } else {
                            throw new Error('Tidak dapat mengakses video dari pesan yang dikutip');
                        }
                    }
                }
            } catch (error) {
                await sendQuotedReply(sock, msg, `❌ Gagal mendownload video dari pesan yang dikutip

🔧 *Kemungkinan penyebab:*
• Video sudah expired atau dihapus
• Bot tidak memiliki akses ke media lama
• Pesan yang dikutip bukan video valid
• Server WhatsApp sedang bermasalah

💡 *Solusi:*
• Coba kirim ulang video dengan caption ${config.bot.prefix}hdvid
• Pastikan video masih dapat dilihat
• Forward video lalu reply dengan ${config.bot.prefix}hdvid
• Gunakan video yang baru dikirim`);
                return;
            }
        }

        // Jika tidak ada video atau buffer kosong
        if (!videoBuffer || videoBuffer.length === 0) {
            await sendQuotedReply(sock, msg, `❌ *FORMAT SALAH!*

📝 *Cara penggunaan:*
• Kirim video dengan caption: ${config.bot.prefix}hdvid
• Reply video dengan: ${config.bot.prefix}hdvid

🎥 *Contoh:*
• [kirim video] + caption "${config.bot.prefix}hdvid"
• Reply video lalu ketik "${config.bot.prefix}hdvid"

⚠️ *Catatan:*
• Hanya support format video (MP4, AVI, MOV, dll)
• Ukuran file maksimal 50MB
• Pastikan video tidak corrupt atau expired

🔧 *Tips tambahan:*
• Jika reply video gagal, coba kirim ulang video
• Forward video dari chat lain lalu reply
• Pastikan video masih bisa dilihat dengan normal`);
            return;
        }

        // Validasi apakah buffer benar-benar video
        const validVideoHeaders = [
            { header: Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]), name: 'MP4' },
            { header: Buffer.from([0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70]), name: 'MP4_ALT' },
            { header: Buffer.from([0x52, 0x49, 0x46, 0x46]), name: 'AVI' },
            { header: Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]), name: 'MOV' },
            { header: Buffer.from([0x1A, 0x45, 0xDF, 0xA3]), name: 'MKV' },
            { header: Buffer.from([0x46, 0x4C, 0x56]), name: 'FLV' }
        ];

        const detectedFormat = validVideoHeaders.find(format => {
            if (format.name === 'AVI') {
                return videoBuffer.subarray(0, 4).equals(format.header) && 
                       videoBuffer.subarray(8, 11).equals(Buffer.from([0x41, 0x56, 0x49]));
            }
            return videoBuffer.subarray(0, format.header.length).equals(format.header);
        });

        const isValidVideo = detectedFormat !== undefined;

        if (!isValidVideo) {
            await sendQuotedReply(sock, msg, `❌ *FILE TIDAK VALID!*

🚫 File yang dikirim bukan format video yang didukung

📝 *Format yang didukung:*
• MP4 (.mp4) - Recommended
• AVI (.avi) - Classic format
• MOV (.mov) - QuickTime
• MKV (.mkv) - Matroska
• FLV (.flv) - Flash Video

🔍 *Buffer Info:*
• Size: ${videoBuffer.length} bytes
• Header: ${videoBuffer.subarray(0, 8).toString('hex')}

💡 *Solusi:*
• Pastikan file adalah video asli
• Jangan gunakan document yang diubah extensi
• Kirim video langsung dari galeri
• Coba convert ke MP4 terlebih dahulu`);
            return;
        }

        // Check ukuran file (maksimal 50MB)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (videoBuffer.length > maxSize) {
            await sendQuotedReply(sock, msg, `❌ *UKURAN FILE TERLALU BESAR!*

📊 *Info Ukuran:*
• Ukuran video: ${Math.round(videoBuffer.length / 1024 / 1024)}MB
• Maksimal: 50MB

💡 *Solusi:*
• Kompres video terlebih dahulu
• Gunakan video dengan durasi lebih pendek
• Kurangi resolusi video
• Gunakan bitrate yang lebih rendah`);
            return;
        }

        // Kirim pesan loading
        await sendQuotedReply(sock, msg, '⏳ Sedang memproses video...\n🎬 Meningkatkan kualitas HD...\n⚙️ Mohon tunggu, proses mungkin membutuhkan waktu...');

        // Pastikan folder temp ada
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const timestamp = Date.now();
        const inputPath = path.join(tempDir, `input_${timestamp}.mp4`);
        const outputPath = path.join(tempDir, `output_${timestamp}.mp4`);

        try {
            // Simpan video input
            fs.writeFileSync(inputPath, videoBuffer);

            // Check if FFmpeg is available
            try {
                await execPromise('ffmpeg -version');
            } catch (ffmpegCheckError) {
                throw new Error('FFmpeg not installed or not accessible');
            }

            // Command FFmpeg untuk HD enhancement
            const ffmpegCommand = `ffmpeg -i "${inputPath}" -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${outputPath}"`;

            await execPromise(ffmpegCommand);

            // Baca hasil video
            const videoResult = fs.readFileSync(outputPath);
            const formatDetected = detectedFormat ? detectedFormat.name : 'Unknown';

            // Kirim hasil video yang sudah di-enhance
            await sock.sendMessage(senderJid, {
                video: videoResult,
                caption: `✅ *VIDEO HD ENHANCEMENT SELESAI!*

🎬 *Detail Proses:*
├─ Format: ${formatDetected}
├─ Size: ${Math.round(videoBuffer.length / 1024)}KB → ${Math.round(videoResult.length / 1024)}KB
├─ Codec: H.264 Baseline Level 3.0
├─ Audio: AAC 128kbps
└─ Optimasi: Fast Start Enabled

🎥 *Enhancement Applied:*
• Video codec optimization
• Audio quality enhancement
• Streaming optimization
• Cross-platform compatibility

⚡ *Processing Time:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}

🤖 *WilyKun Bot - HD Video Tools*`,
                fileName: `hdvid_${timestamp}.mp4`,
                mimetype: 'video/mp4'
            }, { quoted: msg });

        } catch (error) {
            let errorMessage = '❌ Gagal memproses video';

            if (error.message.includes('ffmpeg')) {
                errorMessage = '❌ FFmpeg tidak tersedia atau error saat memproses';
            } else if (error.message.includes('timeout')) {
                errorMessage = '❌ Proses video terlalu lama (timeout)';
            } else if (error.message.includes('Invalid')) {
                errorMessage = '❌ Format video tidak valid atau corrupt';
            }

            await sendQuotedReply(sock, msg, `${errorMessage}

🔄 *Solusi:*
• Pastikan video tidak rusak atau corrupt
• Coba dengan video yang lebih kecil
• Tunggu beberapa saat lalu coba lagi
• Gunakan format MP4 untuk hasil terbaik

💡 *Tips:*
• Video pendek lebih cepat diproses
• Pastikan format video didukung
• Hindari video dengan encoding yang aneh`);

        } finally {
            // Cleanup files
            try {
                if (fs.existsSync(inputPath)) {
                    fs.unlinkSync(inputPath);
                }
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
            } catch (cleanupError) {
                // Silent cleanup error
            }
        }

    } catch (error) {
        let errorMessage = '❌ *ERROR HD VIDEO PROCESSING*\n\n';

        if (error.message && error.message.includes('ffmpeg')) {
            errorMessage += '🔧 *FFmpeg tidak ditemukan!*\n\n';
            errorMessage += '📋 *Solusi:*\n';
            errorMessage += '• FFmpeg belum terinstall di sistem\n';
            errorMessage += '• Silakan tunggu, admin sedang install FFmpeg\n';
            errorMessage += '• Coba lagi setelah beberapa menit\n\n';
            errorMessage += '💡 *Info:* FFmpeg diperlukan untuk processing video HD';
        } else {
            errorMessage += '⚠️ *Terjadi error saat processing video*\n\n';
            errorMessage += '📋 *Kemungkinan penyebab:*\n';
            errorMessage += '• File video terlalu besar\n';
            errorMessage += '• Format video tidak didukung\n';
            errorMessage += '• Server sedang overload\n\n';
            errorMessage += '💡 *Solusi:* Coba dengan video yang lebih kecil atau tunggu sebentar';
        }

        await sock.sendMessage(msg.key.remoteJid, { text: errorMessage }, { quoted: msg });
    } finally {
        
    }
}

module.exports = {
    handleHdVidCommand
};
