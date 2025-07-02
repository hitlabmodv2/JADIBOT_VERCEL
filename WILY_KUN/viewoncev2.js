
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

// Fungsi untuk load config
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
    return {
        bot: { mode: 'public', prefix: '.', owner: '', botNumber: '' },
        autoFeatures: {}
    };
}

async function ReplyRynzz(teks, m, client, file = null, useRandomVideo = false) {
    const hariini = new Date().toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
    const senderName = m.pushName || (m.key.participant || m.key.remoteJid).split('@')[0];
    const formattedDate = new Date().toLocaleDateString('id-ID');

    // Get user profile picture
    let profilePic;
    try {
        const userJid = m.key.participant || m.key.remoteJid;
        profilePic = await client.profilePictureUrl(userJid, 'image');
    } catch (error) {
        profilePic = "https://files.catbox.moe/mxohav.gif";
    }

    if (useRandomVideo) {
        // Get random video/GIF from VID_GIF_ANIME folder
        const videoFolder = path.join(__dirname, '../VID_GIF_ANIME');
        let selectedVideoPath = null;
        let selectedFileName = 'viewoncev2';

        if (fs.existsSync(videoFolder)) {
            try {
                const videoFiles = fs.readdirSync(videoFolder).filter(file => {
                    const ext = path.extname(file).toLowerCase();
                    return ['.mp4', '.gif', '.webm', '.mov', '.avi'].includes(ext);
                });

                if (videoFiles.length > 0) {
                    const randomIndex = Math.floor(Math.random() * videoFiles.length);
                    const selectedFile = videoFiles[randomIndex];
                    selectedVideoPath = path.join(videoFolder, selectedFile);
                    selectedFileName = path.basename(selectedFile, path.extname(selectedFile));
                }
            } catch (error) {
                // Silent error handling
            }
        }

        const localVideoPath = selectedVideoPath || path.join(__dirname, '../VID_GIF_ANIME/kanna-album.mp4');

        if (fs.existsSync(localVideoPath)) {
            const animatedContent = {
                video: fs.readFileSync(localVideoPath),
                caption: teks,
                gifPlayback: true,
                ptv: false,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterName: `📱 ${selectedFileName.charAt(0).toUpperCase() + selectedFileName.slice(1)} ViewOnce V2`,
                        newsletterJid: "120363312297133690@newsletter",
                    },
                    externalAdReply: {
                        showAdAttribution: true,
                        title: `📱 ${senderName}`,
                        body: `ViewOnce V2 • ${selectedFileName} • ${formattedDate}`,
                        previewType: "VIDEO",
                        thumbnailUrl: profilePic || "https://files.catbox.moe/mxohav.gif",
                        sourceUrl: "https://wa.me/6289688206739",
                        mediaType: 2,
                        renderLargerThumbnail: false
                    },
                },
            };

            try {
                return await client.sendMessage(m.key.remoteJid, animatedContent, { quoted: m });
            } catch (error) {
                // Fallback to regular method
            }
        }
    }

    // Regular message method
    const nedd = {      
        contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterName: "📱 ViewOnce V2 Media",
                newsletterJid: "120363312297133690@newsletter",
            },
            externalAdReply: {  
                showAdAttribution: true,
                title: `${hariini}`,
                body: `📱 ViewOnce V2 Media`,
                previewType: "IMAGE",
                thumbnailUrl: profilePic || "https://files.catbox.moe/mxohav.gif",
                sourceUrl: "https://wa.me/6289688206739",
                mediaType: 1,
                renderLargerThumbnail: false
            },
        },
        text: teks,
    };

    return client.sendMessage(m.key.remoteJid, nedd, { quoted: m });
}

// Fungsi untuk ekstrak media dari berbagai struktur pesan
function extractMediaFromMessage(quotedMsg) {
    let targetMessage = quotedMsg;

    // Check if it's wrapped in ephemeral message
    if (quotedMsg.ephemeralMessage?.message) {
        targetMessage = quotedMsg.ephemeralMessage.message;
    }

    // Check if it's a viewOnceMessage wrapper
    if (quotedMsg.viewOnceMessage?.message) {
        targetMessage = quotedMsg.viewOnceMessage.message;
    }

    // Check all possible media types
    const mediaTypes = [
        'imageMessage',
        'videoMessage', 
        'audioMessage',
        'documentMessage',
        'stickerMessage'
    ];

    for (const mediaType of mediaTypes) {
        if (targetMessage[mediaType]) {
            return {
                mediaMessage: targetMessage[mediaType],
                mediaType: mediaType,
                isViewOnce: targetMessage[mediaType].viewOnce === true || 
                           quotedMsg.viewOnceMessage || 
                           quotedMsg.ephemeralMessage?.message?.[mediaType]?.viewOnce === true
            };
        }
    }

    return null;
}

// Fungsi untuk cek apakah pesan adalah view once
function isViewOnceMessage(quotedMsg) {
    // Direct view once check
    if (quotedMsg.viewOnceMessage) return true;

    // Check ephemeral wrapper
    if (quotedMsg.ephemeralMessage?.message) {
        const ephemeralContent = quotedMsg.ephemeralMessage.message;
        if (ephemeralContent.viewOnceMessage) return true;

        // Check media properties in ephemeral
        const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
        for (const type of mediaTypes) {
            if (ephemeralContent[type]?.viewOnce) return true;
        }
    }

    // Direct media view once check
    const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
    for (const type of mediaTypes) {
        if (quotedMsg[type]?.viewOnce) return true;
    }

    return false;
}

// Handler utama untuk fitur .rvov2
async function viewOnceV2Handler(sock, msg) {
    try {
        const messageText = msg.message?.conversation || 
                           msg.message?.extendedTextMessage?.text || '';
        
        const config = loadConfig();
        const prefix = config.bot.prefix || '.';
        
        // Cek apakah command adalah .rvov2 (HARUS EXACT MATCH)
        const cleanCommand = messageText.toLowerCase().trim();
        if (!cleanCommand || cleanCommand !== `${prefix}rvov2`) {
            return false;
        }

        // Prevent duplicate processing
        if (msg._viewOnceV2Processed) {
            return true;
        }
        msg._viewOnceV2Processed = true;

        // VALIDASI AKSES BERDASARKAN MODE BOT
        const botNumber = sock.user?.id?.split(':')[0];
        const senderJid = msg.key.remoteJid;
        
        // Ekstrak nomor pengirim yang tepat
        let actualSenderNumber;
        if (msg.key.participant) {
            // Jika ada participant (pesan grup), gunakan itu
            actualSenderNumber = msg.key.participant.split('@')[0];
        } else if (msg.key.fromMe) {
            // Jika pesan dari bot sendiri, gunakan bot number
            actualSenderNumber = botNumber;
        } else {
            // Untuk private chat biasa
            actualSenderNumber = senderJid?.split('@')[0];
        }

        // Validasi akses berdasarkan mode bot
        if (config.bot?.mode === 'self') {
            const isBotNumber = actualSenderNumber === botNumber;
            const isOwnerNumber = actualSenderNumber === config.bot?.owner;
            const isBotNumberFromConfig = actualSenderNumber === config.bot?.botNumber;
            const isFromMe = msg.key.fromMe === true;
            
            // Untuk mode self: HANYA owner/bot yang bisa akses
            const isAuthorizedUser = isFromMe || isBotNumber || isOwnerNumber || isBotNumberFromConfig;

            if (!isAuthorizedUser) {
                // Bot diam saja, tidak ada response untuk user yang tidak authorized
                return true; // Return true agar tidak diproses lebih lanjut
            }
        }

        // Cek apakah ada quoted message
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quotedMsg) {
            await ReplyRynzz(`⚠️ *Cara Penggunaan ViewOnce V2*

📋 *Command:* ${prefix}rvov2
🔄 *Action:* Reply pesan view once yang ingin dikirim ke nomor tujuan

✅ *Format yang Didukung:*
• 🖼️ Gambar View Once
• 🎥 Video View Once  
• 🎵 Audio View Once
• 📄 Dokumen View Once
• 🏷️ Sticker View Once

📨 *Fitur Khusus V2:*
• Media dikirim langsung ke nomor tujuan
• Konfigurasi nomor tujuan di config.json
• Support semua format media
• Enhanced security system

💡 *Contoh Penggunaan:*
1. Reply pesan view once
2. Ketik: ${prefix}rvov2
3. Media akan dikirim ke: ${config.rvov2Target || config.backupTarget || '6289688206739'}

🤖 Mode Bot: ${config.bot.mode.toUpperCase()} ✅
📱 Target Number: ${config.rvov2Target || config.backupTarget || '6289688206739'}`, msg, sock, null, true);
            return true;
        }

        // Enhanced media detection
        const mediaInfo = extractMediaFromMessage(quotedMsg);
        const isViewOnce = isViewOnceMessage(quotedMsg);

        // Check if we found media
        if (!mediaInfo) {
            const allKeys = Object.keys(quotedMsg);
            const ephemeralKeys = quotedMsg.ephemeralMessage?.message ? Object.keys(quotedMsg.ephemeralMessage.message) : [];
            const viewOnceKeys = quotedMsg.viewOnceMessage?.message ? Object.keys(quotedMsg.viewOnceMessage.message) : [];

            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    react: { text: '❓', key: msg.key }
                });
            } catch (reactionError) {
                // Silent error handling
            }
            return true;
        }

        // Waktu Jakarta yang akurat
        const jakartaTime = new Date().toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const formatCaption = (type, originalCaption = '') => {
            return `╭━━━『 *📱 VIEW ONCE V2 MEDIA* 』━━━┄⊱
┃
┃ *🎯 Type:* ${type}
┃ *📅 Waktu:* ${jakartaTime} WIB
┃ *💬 Caption:* ${originalCaption || 'No caption'}
┃ *🔒 Mode:* Forward to Owner
┃ *📱 Sender:* ${msg.pushName || 'Unknown'}
┃ *📞 From Chat:* ${msg.key.remoteJid.split('@')[0]}
┃ *✅ Status:* Successfully Forwarded
┃
┃ *✨ ViewOnce V2 Features:*
┃ ⌬ Auto forward ke owner
┃ ⌬ Preservasi media permanen
┃ ⌬ Anti delete protection
┃ ⌬ Format caption enhanced
┃ ⌬ Support semua media type
┃ ⌬ Private delivery system
┃
╰━━━━━━━━━━━━━━━━━┄⊱

_📱 ViewOnce V2 media telah berhasil dikirim ke owner!_
_🔐 Premium ViewOnce V2 Feature - WilyKun Bot_`;
        };

        // Create message key for download
        const messageKey = {
            remoteJid: msg.key.remoteJid,
            fromMe: false,
            id: msg.message?.extendedTextMessage?.contextInfo?.stanzaId || msg.key.id,
            participant: msg.key.participant || msg.key.remoteJid
        };

        // Create proper message structure for download
        let downloadMessage = {};
        downloadMessage[mediaInfo.mediaType] = mediaInfo.mediaMessage;

        try {
            // Download media
            const buffer = await downloadMediaMessage(
                {
                    message: downloadMessage,
                    key: messageKey
                },
                "buffer",
                {},
                { logger: pino({ level: "silent" }) }
            );

            const caption = mediaInfo.mediaMessage.caption || '';
            let mediaTypeDisplay = '';
            let sendOptions = {};

            // Handle different media types
            switch (mediaInfo.mediaType) {
                case 'imageMessage':
                    mediaTypeDisplay = '🖼️ Image';
                    sendOptions = {
                        image: buffer,
                        caption: formatCaption(mediaTypeDisplay, caption)
                    };
                    break;

                case 'videoMessage':
                    mediaTypeDisplay = '🎥 Video';
                    sendOptions = {
                        video: buffer,
                        caption: formatCaption(mediaTypeDisplay, caption)
                    };
                    break;

                case 'audioMessage':
                    mediaTypeDisplay = '🎵 Audio';
                    sendOptions = {
                        audio: buffer,
                        caption: formatCaption(mediaTypeDisplay, caption),
                        mimetype: mediaInfo.mediaMessage.mimetype || 'audio/ogg; codecs=opus',
                        ptt: mediaInfo.mediaMessage.ptt || false
                    };
                    break;

                case 'documentMessage':
                    mediaTypeDisplay = '📄 Document';
                    sendOptions = {
                        document: buffer,
                        caption: formatCaption(mediaTypeDisplay, caption),
                        mimetype: mediaInfo.mediaMessage.mimetype || 'application/octet-stream',
                        fileName: mediaInfo.mediaMessage.fileName || 'ViewOnceV2_Document'
                    };
                    break;

                case 'stickerMessage':
                    mediaTypeDisplay = '🏷️ Sticker';
                    sendOptions = {
                        sticker: buffer
                    };
                    break;

                default:
                    throw new Error(`Unsupported media type: ${mediaInfo.mediaType}`);
            }

            // Tentukan nomor tujuan berdasarkan config - prioritas rvov2Target
            let destinationNumber = config.rvov2Target || config.backupTarget || config.bot?.owner || '6289688206739';
            
            // Jika tidak ada rvov2Target, gunakan logika lama
            if (!config.rvov2Target) {
                destinationNumber = config.bot?.owner;
                // Jika owner sama dengan bot number, kirim ke bot number
                if (config.bot?.owner === config.bot?.botNumber) {
                    destinationNumber = config.bot?.botNumber;
                }
            }

            // Format nomor tujuan
            const targetJid = destinationNumber + '@s.whatsapp.net';

            // Send media to owner/bot number
            await sock.sendMessage(targetJid, sendOptions);

            // Send loading reaction first
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    react: { text: '⏳', key: msg.key }
                });
                
                // Wait a moment for loading effect
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Send success reaction for original message
                await sock.sendMessage(msg.key.remoteJid, {
                    react: { text: '✅', key: msg.key }
                });

                // Add reaction to the quoted message (ViewOnce message)
                const quotedKey = {
                    remoteJid: msg.key.remoteJid,
                    fromMe: false,
                    id: msg.message?.extendedTextMessage?.contextInfo?.stanzaId || msg.key.id,
                    participant: msg.key.participant || msg.key.remoteJid
                };

                await new Promise(resolve => setTimeout(resolve, 500));
                
                // React to the original ViewOnce message
                await sock.sendMessage(msg.key.remoteJid, {
                    react: { text: '📨', key: quotedKey }
                });
                
            } catch (reactionError) {
                // Silent error handling for reactions
            }

        } catch (downloadError) {
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    react: { text: '❌', key: msg.key }
                });
            } catch (reactionError) {
                // Silent error handling
            }
        }

        return true;

    } catch (error) {
        try {
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: '⚠️', key: msg.key }
            });
        } catch (reactionError) {
            // Silent error handling
        }
        return true;
    }
}

module.exports = { 
    viewOnceV2Handler,
    extractMediaFromMessage,
    isViewOnceMessage
};
