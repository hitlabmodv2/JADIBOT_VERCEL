import fs from 'fs';
import path from 'path';
import { Wily } from '../../CODE_REPLY/reply.js';
import { getSelamat, getHari, getTanggal, getBulan, getTahun, getWaktu } from '../../lib/CodeAsiaJakarta.js';

// Fungsi untuk membaca data emoji dari EMOJI.json
function readEmojiData() {
    const emojiPath = path.join(process.cwd(), 'WILY_KUN', 'LIST_EMOJI', 'EMOJI.json');
    try {
        if (fs.existsSync(emojiPath)) {
            const emojiData = JSON.parse(fs.readFileSync(emojiPath, 'utf8'));
            return emojiData;
        } else {
            // Jika file tidak ada, kembalikan struktur default
            return { REACT_STATUS: ['❤️', '😍', '😊', '👍', '🔥'] };
        }
    } catch (error) {
        console.error('Gagal membaca EMOJI.json:', error.message);
        // Jika terjadi error, kembalikan struktur default
        return { REACT_STATUS: ['❤️', '😍', '😊', '👍', '🔥'] };
    }
}

/**
 * Fungsi untuk mendapatkan emoji acak dari config
 */
function getRandomEmoji() {
    try {
        const emojiData = readEmojiData();
        const emojis = Array.isArray(emojiData.REACT_STATUS)
            ? emojiData.REACT_STATUS
            : emojiData.REACT_STATUS?.split(',')
                .map(e => e.trim())
                .filter(Boolean) || ['❤️', '😍', '😊', '👍', '🔥'];
        return emojis[Math.floor(Math.random() * emojis.length)];
    } catch (error) {
        // Fallback emoji
        const fallbackEmojis = ['❤️', '😍', '😊', '👍', '🔥', '💯', '😂', '🥰'];
        return fallbackEmojis[Math.floor(Math.random() * fallbackEmojis.length)];
    }
}

/**
 * Fungsi untuk membersihkan array emoji dari tanda kutip dan spasi berlebih
 */
function cleanEmojiArray(emojiArray) {
    if (!emojiArray) return [];
    return Array.isArray(emojiArray)
        ? emojiArray.map(emoji => emoji.trim().replace(/['"]/g, '')).filter(Boolean)
        : emojiArray.split(',').map(emoji => emoji.trim().replace(/['"]/g, '')).filter(Boolean);
}

/**
 * Fungsi untuk memvalidasi dan memperbaiki file EMOJI.json
 */
function validateAndRepairEmojiFile() {
    const emojiPath = path.join(process.cwd(), 'WILY_KUN', 'LIST_EMOJI', 'EMOJI.json');

    try {
        // Pastikan direktori ada
        const dirPath = path.dirname(emojiPath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log('📁 Created directory:', dirPath);
        }

        // Cek apakah file ada dan valid
        if (fs.existsSync(emojiPath)) {
            try {
                const data = fs.readFileSync(emojiPath, 'utf8');
                const parsed = JSON.parse(data);

                // Validasi struktur
                if (!parsed || !parsed.REACT_STATUS) {
                    throw new Error('Invalid structure');
                }

                console.log('✅ EMOJI.json is valid');
                return true;
            } catch (parseError) {
                console.log('⚠️ EMOJI.json is corrupted, repairing...');
            }
        }

        // Buat file default jika tidak ada atau rusak
        const defaultData = {
            "REACT_STATUS": ["😍"]
        };

        fs.writeFileSync(emojiPath, JSON.stringify(defaultData, null, 2), 'utf8');
        console.log('🔧 Created/repaired EMOJI.json with default data');

        return true;
    } catch (error) {
        console.error('❌ Failed to validate/repair EMOJI.json:', error.message);
        return false;
    }
}



/**
 * Fungsi untuk mendapatkan tipe status
 */
function getStatusType(m) {
    // Cek tipe dari message object
    if (m.message) {
        if (m.message.imageMessage) return 'Gambar 🖼️';
        if (m.message.videoMessage) return 'Video 🎥';
        if (m.message.extendedTextMessage || m.message.conversation) return 'Teks 📝';
        if (m.message.audioMessage) return 'Audio 🎵';
        if (m.message.stickerMessage) return 'Sticker 🏷️';
        if (m.message.documentMessage) return 'Dokumen 📄';
        if (m.message.contactMessage) return 'Kontak 👤';
        if (m.message.locationMessage) return 'Lokasi 📍';
    }
    
    // Fallback ke m.type jika ada
    if (m.type) {
        if (m.type === 'imageMessage') return 'Gambar 🖼️';
        if (m.type === 'videoMessage') return 'Video 🎥';
        if (m.type === 'extendedTextMessage' || m.type === 'conversation') return 'Teks 📝';
        if (m.type === 'audioMessage') return 'Audio 🎵';
        if (m.type === 'stickerMessage') return 'Sticker 🏷️';
        return `Status ${m.type} 📄`;
    }
    
    return 'Status 📄';
}

/**
 * Fungsi untuk sensor nomor
 */
function sensorNumber(phoneNumber) {
    if (phoneNumber.length > 6) {
        let start = phoneNumber.substring(0, 6);
        let end = phoneNumber.substring(phoneNumber.length - 4);
        let middle = '*'.repeat(phoneNumber.length - 10);
        return start + middle + end;
    }
    return phoneNumber;
}

/**
 * Handler untuk konfirmasi reply
 */
export async function handleReactionConfirmation(m, { hisoka }) {
    try {
        // Cek apakah ini reply ke pesan konfirmasi
        if (!m.quoted || !m.quoted.key || !m.quoted.key.id) {
            return false;
        }

        const replyText = m.body?.toLowerCase().trim();
        if (!replyText || !['y', 'yes', 'n', 'no'].includes(replyText)) {
            return false;
        }

        const quotedMessageId = m.quoted.key.id;
        const senderNumber = m.sender.split('@')[0];

        // Baca data konfirmasi
        const confirmPath = './DATA/confirmations.json';
        if (!fs.existsSync(confirmPath)) {
            return false;
        }

        let confirmations = {};
        try {
            confirmations = JSON.parse(fs.readFileSync(confirmPath, 'utf8'));
        } catch (error) {
            return false;
        }

        const confirmData = confirmations[quotedMessageId];
        if (!confirmData || confirmData.senderId !== senderNumber || confirmData.type !== 'reaction_set_confirm') {
            return false;
        }

        // Cek timeout (30 detik)
        const currentTime = Date.now();
        const timeout = 30 * 1000; // 30 detik
        if (currentTime - confirmData.timestamp > timeout) {
            delete confirmations[quotedMessageId];
            fs.writeFileSync(confirmPath, JSON.stringify(confirmations, null, 2));
            await Wily(`⏱️ *KONFIRMASI TIMEOUT*\n\n❌ Waktu konfirmasi telah habis (30 detik)\n💡 Silakan jalankan command \`.reaction set\` lagi jika masih ingin mengubah emoji`, m, hisoka);
            return true;
        }

        // Hapus data konfirmasi
        delete confirmations[quotedMessageId];
        fs.writeFileSync(confirmPath, JSON.stringify(confirmations, null, 2));

        // Proses konfirmasi
        if (['y', 'yes'].includes(replyText)) {
            // Konfirmasi ya - lakukan perubahan
            try {
                const emojiData = readEmojiData();
                const oldEmojis = Array.isArray(emojiData.REACT_STATUS)
                    ? emojiData.REACT_STATUS.join(',')
                    : emojiData.REACT_STATUS || '❤️,😍,😊,👍,🔥';

                // Update EMOJI.json
                const emojiPath = path.join(process.cwd(), 'WILY_KUN', 'LIST_EMOJI', 'EMOJI.json');
                const newEmojiData = { REACT_STATUS: confirmData.newEmojis };

                // Pastikan direktori ada
                const dirPath = path.dirname(emojiPath);
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                }

                // Format JSON dengan emoji horizontal
                const jsonString = JSON.stringify(newEmojiData, null, 2).replace(
                    /"REACT_STATUS": \[\s*([^\]]+)\s*\]/s,
                    (match, content) => {
                        const emojis = content.match(/"[^"]+"/g) || [];
                        const formattedEmojis = emojis.join(', ');
                        return `"REACT_STATUS": [${formattedEmojis}]`;
                    }
                );
                fs.writeFileSync(emojiPath, jsonString);

                // Verifikasi perubahan
                const savedEmojiData = readEmojiData();
                const savedEmojis = Array.isArray(savedEmojiData.REACT_STATUS)
                    ? savedEmojiData.REACT_STATUS.join(',')
                    : savedEmojiData.REACT_STATUS || '❤️,😍,😊,👍,🔥';

                // Tampilkan emoji dengan format spoiler
                const oldEmojiArray = oldEmojis.split(',').map(e => e.trim());
                const oldDisplayEmojis = oldEmojiArray.slice(0, 10);
                const oldRemainingCount = oldEmojiArray.length - 10;
                let oldEmojiDisplay = oldDisplayEmojis.join(' ');
                if (oldRemainingCount > 0) {
                    oldEmojiDisplay += ` ||dan ${oldRemainingCount} emoji lainnya||`;
                }

                const newDisplayEmojis = confirmData.newEmojis.slice(0, 10);
                const newRemainingCount = confirmData.newEmojis.length - 10;
                let newEmojiDisplay = newDisplayEmojis.join(' ');
                if (newRemainingCount > 0) {
                    newEmojiDisplay += ` ||dan ${newRemainingCount} emoji lainnya||`;
                }

                await Wily(`✅ *EMOJI BERHASIL DIRESET & DIUBAH*\n\n🔄 *Perubahan dikonfirmasi*\n\n📋 *Emoji lama (${oldEmojiArray.length}):* ${oldEmojiDisplay}\n✨ *Emoji baru (${confirmData.newEmojis.length}):* ${newEmojiDisplay}\n📊 *Total emoji baru:* ${confirmData.newEmojis.length}\n\n🔄 *Status:* Siap digunakan untuk story reaction\n\n🎯 *Fitur otomatis aktif:*\n• Bot akan react story dengan emoji random\n• Hanya untuk Owner\n• Emoji dipilih secara acak dari ${confirmData.newEmojis.length} pilihan`, m, hisoka);

            } catch (error) {
                await Wily(`❌ *GAGAL MENYIMPAN EMOJI*\n\n🔧 Error: ${error.message}\n📁 Pastikan file EMOJI.json dapat ditulis\n\n💡 Coba restart bot jika masalah berlanjut`, m, hisoka);
            }
        } else {
            // Konfirmasi tidak - batalkan perubahan
            await Wily(`❌ *PERUBAHAN DIBATALKAN*\n\n🔄 Emoji tetap seperti semula\n💡 Tidak ada perubahan yang dilakukan\n\n📋 Command dibatalkan atas permintaan user`, m, hisoka);
        }

        return true;

    } catch (error) {
        console.log('Error handling reaction confirmation:', error.message);
        return false;
    }
}

/**
 * Handler untuk command reaction tag - khusus owner
 */
export async function handleReactionCommand(m, { hisoka, text, command }) {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const senderNumber = m.sender.split('@')[0];

        // Cek apakah user adalah owner
        if (!config.OWNER.includes(senderNumber)) {
            if (!config.SELF && config.mode === 'public') {
                await Wily('🚫 *Maaf, fitur ini khusus untuk Owner Bot*\n\n💡 Hanya Owner yang dapat mengatur reaction story\n\n🔒 Akses terbatas untuk menjaga keamanan bot\n\n✨ Terima kasih atas pengertiannya!', m, hisoka);
            }
            return;
        }

        const args = text.trim().split(' ');
        const actionArg = args[0]?.toLowerCase();

        // Handle check command untuk debugging
        if (actionArg === 'check') {
            const emojiPath = path.join(process.cwd(), 'WILY_KUN', 'LIST_EMOJI', 'EMOJI.json');

            let diagnostics = '🔍 *DIAGNOSA FILE EMOJI*\n\n';

            // Cek direktori
            const dirPath = path.dirname(emojiPath);
            diagnostics += `📁 **Direktori:**\n`;
            diagnostics += `• Path: ${dirPath}\n`;
            diagnostics += `• Exists: ${fs.existsSync(dirPath) ? '✅' : '❌'}\n\n`;

            // Cek file
            diagnostics += `📄 **File EMOJI.json:**\n`;
            diagnostics += `• Path: ${emojiPath}\n`;
            diagnostics += `• Exists: ${fs.existsSync(emojiPath) ? '✅' : '❌'}\n`;

            if (fs.existsSync(emojiPath)) {
                try {
                    const stats = fs.statSync(emojiPath);
                    const data = fs.readFileSync(emojiPath, 'utf8');
                    const parsed = JSON.parse(data);

                    diagnostics += `• Size: ${stats.size} bytes\n`;
                    diagnostics += `• Modified: ${stats.mtime.toLocaleString()}\n`;
                    diagnostics += `• Content: ✅ Valid JSON\n`;
                    diagnostics += `• Structure: ${parsed.REACT_STATUS ? '✅' : '❌'}\n`;

                    if (parsed.REACT_STATUS) {
                        const emojis = Array.isArray(parsed.REACT_STATUS) ? parsed.REACT_STATUS : [];
                        diagnostics += `• Emoji count: ${emojis.length}\n`;
                        diagnostics += `• Sample emojis: ${emojis.slice(0, 5).join(' ')}\n`;
                    }

                    diagnostics += `\n📋 **Raw content:**\n\`\`\`\n${data}\n\`\`\``;
                } catch (error) {
                    diagnostics += `• Error: ❌ ${error.message}\n`;
                }
            }

            await Wily(diagnostics, m, hisoka);
            return;
        }

        // Validasi command yang valid terlebih dahulu
        const validCommands = ['on', 'off', 'set', 'delay', 'add', 'del', 'random', 'matikan', 'check'];
        
        // Jika ada actionArg tapi tidak valid, kirim pesan error
        if (actionArg && !validCommands.includes(actionArg)) {
            await Wily(`❌ *COMMAND TIDAK VALID*\n\n🚫 *Command tidak dikenali:* \`.reaction ${actionArg}\`\n\n📋 *COMMAND YANG TERSEDIA:*\n\n🎯 *MODE REAKSI:*\n• \`.reaction on\` - AKTIF (melihat & react)\n• \`.reaction off\` - MELIHAT SAJA (no react)\n• \`.reaction random\` - RANDOM (kadang react/tidak)\n• \`.reaction matikan\` - MATI (tidak melihat story)\n\n⚙️ *PENGATURAN LAINNYA:*\n• \`.reaction set [emoji]\` - Reset & set emoji (perlu konfirmasi)\n• \`.reaction add [emoji]\` - Tambah emoji baru\n• \`.reaction del [emoji]\` - Hapus emoji tertentu\n• \`.reaction delay [detik]\` - Set delay reaction\n• \`.reaction check\` - Diagnosa file emoji\n\n💡 *Tips:* Pastikan mengetik command dengan benar\n📖 *Help:* Ketik \`.reaction\` tanpa parameter untuk melihat status`, m, hisoka);
            return;
        }
        
        // Jika tidak ada argument, tampilkan status
        if (!actionArg) {
            // Baca config terbaru lagi
            const latestConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
            const emojiData = readEmojiData();
            const currentEmojis = Array.isArray(emojiData.REACT_STATUS)
                ? emojiData.REACT_STATUS
                : emojiData.REACT_STATUS?.split(',').map(e => e.trim()).filter(Boolean) || ['❤️', '😍', '😊', '👍', '🔥'];

            // Tampilkan hanya 10 emoji pertama, sisanya spoiler
            let emojiList = '';
            if (Array.isArray(currentEmojis)) {
                const displayEmojis = currentEmojis.slice(0, 10);
                const remainingCount = currentEmojis.length - 10;
                emojiList = displayEmojis.join(' ');
                if (remainingCount > 0) {
                    emojiList += ` ||dan ${remainingCount} emoji lainnya||`;
                }
            } else {
                const emojiArray = currentEmojis.split(',').map(e => e.trim()).filter(Boolean);
                const displayEmojis = emojiArray.slice(0, 10);
                const remainingCount = emojiArray.length - 10;
                emojiList = displayEmojis.join(' ');
                if (remainingCount > 0) {
                    emojiList += ` ||dan ${remainingCount} emoji lainnya||`;
                }
            }

            const currentDelay = latestConfig.REACTION_DELAY || 1;
            const reactionMode = latestConfig.REACTION_MODE || 'on';

            let statusText = '';
            let modeExplanation = '';

            if (reactionMode === 'on') {
                statusText = '🟢 AKTIF';
                modeExplanation = '✅ Bot akan melihat story dan memberikan reaction otomatis\n📱 Setiap story yang dilihat akan di-react dengan emoji random\n🎯 Mode ini membuat bot terlihat aktif dan interaktif';
            } else if (reactionMode === 'off') {
                statusText = '🟡 MELIHAT SAJA'; 
                modeExplanation = '👀 Bot hanya melihat story tanpa memberikan reaction\n📖 Story tetap dibaca/dilihat tapi tidak ada emoji reaction\n🔇 Mode ini untuk melihat story secara diam-diam';
            } else if (reactionMode === 'random') {
                statusText = '🎲 RANDOM MODE';
                modeExplanation = '🎯 Bot akan random antara memberikan reaction atau tidak\n⚡ Kadang react dengan emoji, kadang hanya melihat saja\n🎭 Mode ini membuat bot terlihat seperti manusia normal';
            } else if (reactionMode === 'matikan') {
                statusText = '🔴 DIMATIKAN';
                modeExplanation = '❌ Bot tidak akan melihat story sama sekali\n💤 Fitur auto story viewer sepenuhnya nonaktif\n🚫 Mode ini menghemat bandwidth dan membuat bot benar-benar diam';
            }

            await Wily(`⚡ *AUTO REACTION STORY*\n\n🎯 *Mode Reaksi:* ${statusText}\n📝 *"REACTION_MODE": "${reactionMode}"*\n\n${modeExplanation}\n\n🎭 *Emoji saat ini:* ${emojiList}\n⏱️ *Delay:* ${currentDelay} detik\n\n📋 *MODE REAKSI TERSEDIA:*\n• \`.reaction on\` - AKTIF (melihat & react)\n• \`.reaction off\` - MELIHAT SAJA (no react)\n• \`.reaction random\` - RANDOM (kadang react/tidak)\n• \`.reaction matikan\` - MATI (tidak melihat story)\n\n⚙️ *PENGATURAN LAINNYA:*\n• \`.reaction set [emoji]\` - Reset & set emoji (perlu konfirmasi)\n• \`.reaction add [emoji]\` - Tambah emoji baru\n• \`.reaction del [emoji]\` - Hapus emoji tertentu\n• \`.reaction delay [detik]\` - Set delay reaction\n• \`.reaction check\` - Diagnosa file emoji\n\n💾 Data tersimpan di EMOJI.json`, m, hisoka);
            return;
        }

        // Handle set emoji command with confirmation
        if (actionArg === 'set') {
            const emojiInput = args.slice(1).join(' ');

            if (!emojiInput || emojiInput.trim() === '') {
                await Wily(`❌ *EMOJI TIDAK DIMASUKKAN*\n\n📋 *Cara penggunaan:*\n• \`.reaction set [emoji1,emoji2,emoji3]\` - Reset & set emoji\n\n💡 *Contoh:*\n• \`.reaction set ❤️,😍,🔥,👍,😊\`\n• \`.reaction set 🎉,✨,💯,🚀,⭐\`\n\n⚠️ Pisahkan emoji dengan koma (,)`, m, hisoka);
                return;
            }

            // Validasi emoji (cek apakah mengandung koma untuk multiple emoji)
            const emojiList = emojiInput.split(',').map(e => e.trim()).filter(Boolean);

            if (emojiList.length === 0) {
                await Wily(`❌ *FORMAT EMOJI TIDAK VALID*\n\n📋 *Format yang benar:*\n• \`.reaction set emoji1,emoji2,emoji3\`\n\n💡 *Contoh:*\n• \`.reaction set ❤️,😍,🔥\`\n• \`.reaction set 🎉,✨,💯\`\n\n⚠️ Gunakan koma untuk memisahkan emoji`, m, hisoka);
                return;
            }

            // Ambil emoji yang sudah ada untuk ditampilkan
            const emojiData = readEmojiData();
            const currentEmojis = Array.isArray(emojiData.REACT_STATUS)
                ? emojiData.REACT_STATUS
                : emojiData.REACT_STATUS?.split(',').map(e => e.trim()).filter(Boolean) || ['❤️', '😍', '😊', '👍', '🔥'];
            const existingEmojis = cleanEmojiArray(currentEmojis);

            // Tampilkan hanya 10 emoji untuk konfirmasi
            const currentDisplayEmojis = existingEmojis.slice(0, 10);
            const currentRemainingCount = existingEmojis.length - 10;
            let currentEmojiDisplay = currentDisplayEmojis.join(' ');
            if (currentRemainingCount > 0) {
                currentEmojiDisplay += ` ||dan ${currentRemainingCount} emoji lainnya||`;
            }

            const newDisplayEmojis = emojiList.slice(0, 10);
            const newRemainingCount = emojiList.length - 10;
            let newEmojiDisplay = newDisplayEmojis.join(' ');
            if (newRemainingCount > 0) {
                newEmojiDisplay += ` ||dan ${newRemainingCount} emoji lainnya||`;
            }

            // Kirim pesan konfirmasi
            const confirmMessage = await Wily(`⚠️ *KONFIRMASI RESET EMOJI*\n\n🔄 *Aksi:* Reset semua emoji lama dan ganti dengan emoji baru\n\n📋 *Emoji saat ini (${existingEmojis.length}):* ${currentEmojiDisplay}\n✨ *Emoji baru (${emojiList.length}):* ${newEmojiDisplay}\n\n❗ *PERINGATAN:* Semua emoji lama akan dihapus dan diganti dengan emoji baru!\n\n💬 *Balas pesan ini dengan:*\n• Ketik **y** atau **yes** untuk konfirmasi\n• Ketik **n** atau **no** untuk batalkan\n\n⏱️ *Timeout:* 30 detik`, m, hisoka);

            // Simpan data untuk konfirmasi
            const confirmData = {
                type: 'reaction_set_confirm',
                messageId: confirmMessage.key.id,
                senderId: senderNumber,
                newEmojis: emojiList,
                timestamp: Date.now()
            };

            // Simpan ke file sementara untuk konfirmasi
            try {
                let confirmations = {};
                const confirmPath = './DATA/confirmations.json';

                if (fs.existsSync(confirmPath)) {
                    confirmations = JSON.parse(fs.readFileSync(confirmPath, 'utf8'));
                }

                confirmations[confirmMessage.key.id] = confirmData;

                // Pastikan folder DATA ada
                if (!fs.existsSync('./DATA')) {
                    fs.mkdirSync('./DATA', { recursive: true });
                }

                fs.writeFileSync(confirmPath, JSON.stringify(confirmations, null, 2));
            } catch (error) {
                console.log('Error saving confirmation data:', error.message);
            }

            return;
        }

        // Handle delay command
        if (actionArg === 'delay') {
            const delayInput = args[1];

            if (!delayInput || isNaN(delayInput) || parseInt(delayInput) < 1) {
                await Wily(`❌ *DELAY TIDAK VALID*\n\n📋 *Cara penggunaan:*\n• \`.reaction delay [detik]\` - Set delay reaction\n\n💡 *Contoh:*\n• \`.reaction delay 1\` - Delay 1 detik\n• \`.reaction delay 3\` - Delay 3 detik\n• \`.reaction delay 5\` - Delay 5 detik\n\n⚠️ Minimal delay adalah 1 detik`, m, hisoka);
                return;
            }

            const delaySeconds = parseInt(delayInput);

            // Baca config terbaru
            const currentConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
            const currentDelay = currentConfig.REACTION_DELAY || 1;

            // Cek jika delay sudah sama
            if (currentDelay === delaySeconds) {
                await Wily(`ℹ️ *DELAY SUDAH SAMA*\n\n⏱️ *Delay saat ini:* ${currentDelay} detik\n📝 *Delay yang diminta:* ${delaySeconds} detik\n\n🔄 *Status:* Tidak ada perubahan yang diperlukan\n💡 Delay reaction sudah sesuai permintaan\n\n⚡ *Fitur aktif:* Delay ${currentDelay} detik`, m, hisoka);
                return;
            }

            try {
                currentConfig.REACTION_DELAY = delaySeconds;
                fs.writeFileSync('./config.json', JSON.stringify(currentConfig, null, 2));

                // Verifikasi perubahan
                const newConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
                const savedDelay = newConfig.REACTION_DELAY;

                await Wily(`⏱️ *DELAY REACTION BERHASIL DIUBAH*\n\n🔄 *Perubahan:* ${currentDelay} detik ➜ ${savedDelay} detik\n✅ *Delay baru:* ${savedDelay} detik\n🎯 *Status:* Siap digunakan untuk story reaction\n\n💡 *Keterangan:*\n• Bot akan menunggu ${savedDelay} detik sebelum react\n• Delay membantu terlihat lebih natural\n• Data tersimpan di config.json\n\n⚡ *Fitur aktif:* Delay ${savedDelay} detik`, m, hisoka);

            } catch (error) {
                await Wily(`❌ *GAGAL MENYIMPAN DELAY*\n\n🔧 Error: ${error.message}\n📁 Pastikan file config.json dapat ditulis\n\n💡 Coba restart bot jika masalah berlanjut`, m, hisoka);
            }
            return;
        }

        // Handle del emoji command
        if (actionArg === 'del') {
            const emojiInput = args.slice(1).join(' ');

            if (!emojiInput || emojiInput.trim() === '') {
                // Tampilkan emoji yang ada untuk referensi
                const emojiData = readEmojiData();
                const currentEmojis = Array.isArray(emojiData.REACT_STATUS)
                    ? emojiData.REACT_STATUS
                    : emojiData.REACT_STATUS?.split(',').map(e => e.trim()).filter(Boolean) || ['❤️', '😍', '😊', '👍', '🔥'];
                const existingEmojis = cleanEmojiArray(currentEmojis);

                // Tampilkan contoh dengan emoji yang benar-benar ada
                const sampleEmojis = existingEmojis.slice(0, 3); // Ambil 3 emoji pertama sebagai contoh

                await Wily(`❌ *EMOJI TIDAK DIMASUKKAN*\n\n📋 *Cara penggunaan:*\n• \`.reaction del [emoji1,emoji2,emoji3]\` - Hapus emoji\n\n💡 *Contoh dengan emoji yang ada:*\n• \`.reaction del ${sampleEmojis[0] || '❤️'}\`\n• \`.reaction del ${sampleEmojis[0] || '❤️'},${sampleEmojis[1] || '😍'}\`\n• \`.reaction del ${sampleEmojis.slice(0, 3).join(',') || '❤️,😍,🔥'}\`\n\n📝 *Emoji yang tersedia:*\n${existingEmojis.slice(0, 10).join(' ')}${existingEmojis.length > 10 ? ` ||dan ${existingEmojis.length - 10} emoji lainnya||` : ''}\n\n⚠️ Pisahkan emoji dengan koma (,) jika lebih dari satu`, m, hisoka);
                return;
            }

            // Validasi dan bersihkan emoji input
            let deleteEmojis;

            // Cek apakah menggunakan koma sebagai pemisah
            if (emojiInput.includes(',')) {
                deleteEmojis = emojiInput.split(',').map(e => e.trim()).filter(Boolean);
            } else {
                // Jika tidak ada koma, anggap sebagai satu emoji atau pisahkan berdasarkan spasi
                deleteEmojis = emojiInput.trim().split(/\s+/).filter(Boolean);
            }

            if (deleteEmojis.length === 0) {
                await Wily(`❌ *FORMAT EMOJI TIDAK VALID*\n\n📋 *Format yang benar:*\n• \`.reaction del emoji1,emoji2\` (pisah dengan koma)\n• \`.reaction del emoji1 emoji2\` (pisah dengan spasi)\n• \`.reaction del emoji1\` (satu emoji)\n\n💡 *Contoh yang benar:*\n• \`.reaction del ❤️,😍\`\n• \`.reaction del ❤️ 😍\`\n• \`.reaction del 🔥\`\n\n⚠️ Pastikan emoji valid dan ada dalam daftar`, m, hisoka);
                return;
            }

            // Validasi apakah input benar-benar emoji/simbol
            const invalidEmojis = [];
            const validEmojis = [];

            deleteEmojis.forEach(emoji => {
                // Cek apakah berisi karakter emoji Unicode atau simbol yang valid
                const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}]|[\u{2194}-\u{21AA}]|[\u{23CF}]|[\u{23E9}-\u{23F3}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/u;

                // Regex untuk simbol khusus
                const symbolRegex = /^[❤️💛💚💙💜🤍🖤🤎💔❣️💕💞💓💗💖💘💝💟♥️💯💫⭐🌟✨⚡🔥💥💢💤💨👍👎👌✌️🤞🤟🤘🤙👈👉👆👇☝️✋🤚🖐️🖖👋🤏💪🦾🦿🦵🦶👂🦻👃🧠🫀🫁🦷🦴👀👁️👅👄💋🩸]$/;

                if (emoji.length > 0 && (emojiRegex.test(emoji) || symbolRegex.test(emoji) || emoji.length <= 4)) {
                    validEmojis.push(emoji);
                } else {
                    invalidEmojis.push(emoji);
                }
            });

            // Jika ada input yang tidak valid
            if (invalidEmojis.length > 0) {
                await Wily(`❌ *INPUT TIDAK VALID DITEMUKAN*\n\n🚫 *Input tidak valid:* ${invalidEmojis.join(', ')}\n✅ *Input valid:* ${validEmojis.join(', ') || 'Tidak ada'}\n\n💡 *Contoh input yang benar:*\n• \`.reaction del ❤️\`\n• \`.reaction del 😍,🔥\`\n• \`.reaction del 👍 💯 ✨\`\n• \`.reaction del 🎉,⭐,🚀\`\n\n⚠️ Gunakan emoji/simbol yang valid saja`, m, hisoka);
                return;
            }

            // Lanjutkan dengan emoji yang valid
            deleteEmojis = validEmojis;

            // Ambil emoji yang sudah ada
            const emojiData = readEmojiData();
            const currentEmojis = Array.isArray(emojiData.REACT_STATUS) 
                ? emojiData.REACT_STATUS 
                : emojiData.REACT_STATUS?.split(',').map(e => e.trim()).filter(Boolean) || ['❤️', '😍', '😊', '👍', '🔥'];
            const existingEmojis = cleanEmojiArray(currentEmojis);

            // Cek emoji yang tidak ada
            const notFound = [];
            const toDelete = [];

            deleteEmojis.forEach(emoji => {
                if (existingEmojis.includes(emoji)) {
                    toDelete.push(emoji);
                } else {
                    notFound.push(emoji);
                }
            });

            // Jika tidak ada emoji yang bisa dihapus
            if (toDelete.length === 0) {
                // Tampilkan hanya 10 emoji pertama
                const displayEmojis = existingEmojis.slice(0, 10);
                const remainingCount = existingEmojis.length - 10;
                let existingEmojiDisplay = displayEmojis.join(' ');
                if (remainingCount > 0) {
                    existingEmojiDisplay += ` ||dan ${remainingCount} emoji lainnya||`;
                }

                await Wily(`⚠️ *EMOJI TIDAK DITEMUKAN*\n\n🔍 *Emoji yang ingin dihapus:* ${deleteEmojis.join(' ')}\n\n💡 *Emoji saat ini (${existingEmojis.length}):* ${existingEmojiDisplay}\n\n❌ Tidak ada emoji yang cocok untuk dihapus\n\n📋 Pastikan emoji yang ingin dihapus ada dalam daftar`, m, hisoka);
                return;
            }

            // Filter emoji yang tersisa
            const remainingEmojis = existingEmojis.filter(emoji => !toDelete.includes(emoji));

            // Cek jika semua emoji akan terhapus
            if (remainingEmojis.length === 0) {
                // Tampilkan hanya 10 emoji pertama
                const displayEmojis = existingEmojis.slice(0, 10);
                const remainingCount = existingEmojis.length - 10;
                let existingEmojiDisplay = displayEmojis.join(' ');
                if (remainingCount > 0) {
                    existingEmojiDisplay += ` ||dan ${remainingCount} emoji lainnya||`;
                }

                await Wily(`⚠️ *TIDAK BISA HAPUS SEMUA EMOJI*\n\n❌ *Aksi dibatalkan:* Minimal harus ada 1 emoji tersisa\n\n🗑️ *Emoji yang ingin dihapus:* ${toDelete.join(' ')}\n💡 *Emoji saat ini (${existingEmojis.length}):* ${existingEmojiDisplay}\n\n🔄 *Saran:* Gunakan \`.reaction set [emoji]\` untuk mengganti semua emoji`, m, hisoka);
                return;
            }

            try {
                // Update EMOJI.json
                const emojiPath = path.join(process.cwd(), 'WILY_KUN', 'LIST_EMOJI', 'EMOJI.json');
                const newEmojiData = { REACT_STATUS: remainingEmojis };

                // Pastikan direktori ada
                const dirPath = path.dirname(emojiPath);
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                }

                // Format JSON dengan emoji horizontal
                const jsonString = JSON.stringify(newEmojiData, null, 2).replace(
                    /"REACT_STATUS": \[\s*([^\]]+)\s*\]/s,
                    (match, content) => {
                        const emojis = content.match(/"[^"]+"/g) || [];
                        const formattedEmojis = emojis.join(', ');
                        return `"REACT_STATUS": [${formattedEmojis}]`;
                    }
                );
                fs.writeFileSync(emojiPath, jsonString);

                // Verifikasi perubahan
                const savedEmojiData = readEmojiData();
                const savedEmojis = Array.isArray(savedEmojiData.REACT_STATUS)
                    ? savedEmojiData.REACT_STATUS.join(' ')
                    : savedEmojiData.REACT_STATUS || '❤️,😍,😊,👍,🔥';

                // Tampilkan hanya 10 emoji pertama, sisanya spoiler
                const displayEmojis = remainingEmojis.slice(0, 10);
                const remainingCount = remainingEmojis.length - 10;
                let remainingEmojiDisplay = displayEmojis.join(' ');
                if (remainingCount > 0) {
                    remainingEmojiDisplay += ` ||dan ${remainingCount} emoji lainnya||`;
                }

                let responseText = `🗑️ *EMOJI BERHASIL DIHAPUS*\n\n✅ *Emoji terhapus:* ${toDelete.join(' ')}\n📊 *Sisa emoji:* ${remainingEmojis.length}\n\n💾 *Emoji tersisa:* ${remainingEmojiDisplay}`;

                if (notFound.length > 0) {
                    responseText += `\n\n⚠️ *Emoji tidak ditemukan (diabaikan):* ${notFound.join(' ')}`;
                }

                responseText += `\n\n🔄 *Status:* Siap digunakan untuk story reaction\n🎯 *Fitur otomatis aktif:* Bot akan react dengan ${remainingEmojis.length} emoji random`;

                await Wily(responseText, m, hisoka);

            } catch (error) {
                await Wily(`❌ *GAGAL MENGHAPUS EMOJI*\n\n🔧 Error: ${error.message}\n📁 Pastikan file EMOJI.json dapat ditulis\n\n💡 Coba restart bot jika masalah berlanjut`, m, hisoka);
            }
            return;
        }

        // Handle add emoji command
        if (actionArg === 'add') {
            // Validasi dan perbaiki file EMOJI.json jika perlu
            const fileIsValid = validateAndRepairEmojiFile();
            if (!fileIsValid) {
                await Wily(`❌ *GAGAL MEMVALIDASI FILE EMOJI*\n\n🔧 Tidak dapat mengakses atau memperbaiki file EMOJI.json\n📁 Pastikan bot memiliki permission untuk menulis file\n\n💡 Coba restart bot atau periksa permission folder`, m, hisoka);
                return;
            }

            const emojiInput = args.slice(1).join(' ');

            if (!emojiInput || emojiInput.trim() === '') {
                await Wily(`❌ *EMOJI TIDAK DIMASUKKAN*\n\n📋 *Cara penggunaan:*\n• \`.reaction add [emoji1,emoji2,emoji3]\` - Tambah emoji\n\n💡 *Contoh yang benar:*\n• \`.reaction add 🎉,✨,💯\`\n• \`.reaction add 🚀,⭐,🔥\`\n• \`.reaction add 💎 🌈 🦄\` (pisah spasi)\n• \`.reaction add 🔮\` (satu emoji)\n• \`.reaction add '🤩', '🎈', '🎁', '💐', '🌺'\` (dengan kutip)\n\n📝 *Format yang didukung:*\n• Pisah dengan koma: emoji1,emoji2,emoji3\n• Pisah dengan spasi: emoji1 emoji2 emoji3\n• Dengan kutip tunggal: 'emoji1', 'emoji2'\n• Satu emoji: emoji1\n\n⚠️ Gunakan emoji/simbol yang valid`, m, hisoka);
                return;
            }

            // Fungsi untuk membersihkan dan format emoji dengan parsing yang lebih baik
            function cleanAndFormatEmojis(input) {
                // Hapus semua jenis tanda kutip dan bersihkan string
                let cleaned = input
                    .replace(/'/g, '')    // Hapus kutip tunggal
                    .replace(/"/g, '')    // Hapus kutip ganda
                    .replace(/`/g, '')    // Hapus backtick
                    .trim();

                // Jika ada koma, pisahkan berdasarkan koma
                if (cleaned.includes(',')) {
                    return cleaned.split(',')
                        .map(e => e.trim())
                        .filter(e => e.length > 0);
                }

                // Jika tidak ada koma, pisahkan berdasarkan spasi
                return cleaned.split(/\s+/)
                    .map(e => e.trim())
                    .filter(e => e.length > 0);
            }

            // Validasi dan bersihkan emoji input
            let newEmojis = cleanAndFormatEmojis(emojiInput);

            if (newEmojis.length === 0) {
                await Wily(`❌ *FORMAT EMOJI TIDAK VALID*\n\n📋 *Format yang benar:*\n• \`.reaction add emoji1,emoji2,emoji3\` (pisah dengan koma)\n• \`.reaction add emoji1 emoji2 emoji3\` (pisah dengan spasi)\n• \`.reaction add 'emoji1', 'emoji2'\` (dengan kutip)\n• \`.reaction add emoji1\` (satu emoji)\n\n💡 *Contoh yang benar:*\n• \`.reaction add 🎉,✨,💯\`\n• \`.reaction add 🎉 ✨ 💯\`\n• \`.reaction add '🤩', '🎈', '🎁'\`\n• \`.reaction add 🚀\`\n\n⚠️ Pastikan menggunakan emoji/simbol yang valid`, m, hisoka);
                return;
            }

            // Validasi apakah input benar-benar emoji/simbol dengan regex yang lebih lengkap
            const invalidEmojis = [];
            const validEmojis = [];

            newEmojis.forEach(emoji => {
                // Regex yang kompatibel untuk semua versi Node.js
                const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]/u;

                // Cek juga dengan regex tambahan untuk simbol-simbol khusus
                const symbolRegex = /^[❤️💛💚💙💜🤍🖤🤎💔❣️💕💞💓💗💖💘💝💟♥️💯💫⭐🌟✨⚡🔥💥💢💤💨👍👎👌✌️🤞🤟🤘🤙👈👉👆👇☝️✋🤚🖐️🖖👋🤏💪🦾🦿🦵🦶👂🦻👃🧠🫀🫁🦷🦴👀👁️👅👄💋🩸🎭🎨🎵🎶🎤🎸🎯🏆🎪🎈🎁💐🌺🦄]$/;

                if ((emoji.length > 0 && emoji.length <= 11) && (emojiRegex.test(emoji) || symbolRegex.test(emoji))) {
                    validEmojis.push(emoji);
                } else {
                    invalidEmojis.push(emoji);
                }
            });

            // Jika ada input yang tidak valid
            if (invalidEmojis.length > 0) {
                await Wily(`❌ *INPUT TIDAK VALID DITEMUKAN*\n\n🚫 *Input tidak valid:* ${invalidEmojis.join(', ')}\n✅ *Input valid:* ${validEmojis.join(', ') || 'Tidak ada'}\n\n💡 *Contoh input yang benar:*\n• \`.reaction add ❤️\`\n• \`.reaction add 😍,🔥\`\n• \`.reaction add 👍 💯 ✨\`\n• \`.reaction add '🤩', '🎈', '🎁'\`\n• \`.reaction add 🎉,⭐,🚀\`\n• \`.reaction add 💎 🌈 🦄 🔮\`\n\n⚠️ Gunakan emoji/simbol yang valid saja`, m, hisoka);
                return;
            }

            // Lanjutkan dengan emoji yang valid
            newEmojis = validEmojis;

            // Ambil emoji yang sudah ada dengan pembersihan yang konsisten
            const emojiData = readEmojiData();
            const currentEmojis = Array.isArray(emojiData.REACT_STATUS) 
                ? emojiData.REACT_STATUS 
                : (emojiData.REACT_STATUS ? emojiData.REACT_STATUS.split(',').map(e => e.trim()).filter(Boolean) : ['❤️', '😍', '😊', '👍', '🔥']);

            const existingEmojis = cleanEmojiArray(currentEmojis);

            // Cek emoji yang duplikat dengan pemeriksaan yang lebih akurat
            const duplicates = [];
            const uniqueNewEmojis = [];

            newEmojis.forEach(emoji => {
                const trimmedEmoji = emoji.trim();
                if (existingEmojis.includes(trimmedEmoji)) {
                    duplicates.push(trimmedEmoji);
                } else {
                    uniqueNewEmojis.push(trimmedEmoji);
                }
            });

            // Jika semua emoji sudah ada, tampilkan pesan khusus dengan daftar emoji yang sudah ada
            if (duplicates.length > 0 && uniqueNewEmojis.length === 0) {
                // Tampilkan hanya 10 emoji pertama untuk existing emojis
                const displayEmojis = existingEmojis.slice(0, 10);
                const remainingCount = existingEmojis.length - 10;
                let existingEmojiDisplay = displayEmojis.join(' ');
                if (remainingCount > 0) {
                    existingEmojiDisplay += ` ||dan ${remainingCount} emoji lainnya||`;
                }

                // Format duplikat dengan spoiler maksimal 10
                const duplicateDisplayEmojis = duplicates.slice(0, 10);
                const duplicateRemainingCount = duplicates.length - 10;
                let duplicateEmojiDisplay = duplicateDisplayEmojis.join(' ');
                if (duplicateRemainingCount > 0) {
                    duplicateEmojiDisplay += ` ||dan ${duplicateRemainingCount} emoji lainnya||`;
                }

                await Wily(`⚠️ *MAAF ADA EMOJI YANG UDAH ADA*\n\n🔍 *DETEKSI EMOJI DUPLIKAT:*\n${duplicateEmojiDisplay}\n\n❌ *Emoji yang sudah terdaftar di WILY_KUN/LIST_EMOJI/EMOJI.json:*\n${duplicates.slice(0, 10).join(', ')}${duplicates.length > 10 ? ` ||dan ${duplicates.length - 10} lainnya||` : ''}\n\n💡 *Emoji saat ini terdaftar (${existingEmojis.length}):*\n${existingEmojiDisplay}\n\n🚫 *Emoji duplikat tidak akan disimpan karena:*\n• Sudah ada dalam database\n• Untuk menghindari duplikasi data\n• Menjaga efisiensi penyimpanan\n\n📋 *Silakan gunakan emoji yang berbeda atau:*\n• \`.reaction set [emoji]\` - Replace semua emoji\n• \`.reaction del [emoji]\` - Hapus emoji tertentu\n\n✨ *Tolong kaurat ya, emoji duplikat tidak akan tersimpan!*`, m, hisoka);
                return;
            }

            // Jika ada campuran duplikat dan baru, proses yang baru saja
            try {
                // Gabungkan emoji lama dengan emoji baru yang unik
                const allEmojis = [...existingEmojis, ...uniqueNewEmojis];

                // Update EMOJI.json dengan format yang rapih
                const emojiPath = path.join(process.cwd(), 'WILY_KUN', 'LIST_EMOJI', 'EMOJI.json');

                // Format data dengan struktur yang konsisten - pastikan array bersih
                const newEmojiData = {
                    REACT_STATUS: allEmojis.map(emoji => emoji.trim()).filter(e => e.length > 0)
                };

                // Pastikan direktori ada
                const dirPath = path.dirname(emojiPath);
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                }

                // Tulis file dengan format JSON yang rapih dan indentasi yang benar
                fs.writeFileSync(emojiPath, JSON.stringify(newEmojiData, null, 2), 'utf8');

                // Force flush untuk memastikan data benar-benar tertulis
                const fd = fs.openSync(emojiPath, 'r+');
                fs.fsyncSync(fd);
                fs.closeSync(fd);

                // Verifikasi perubahan dengan membaca ulang file
                const savedEmojiData = readEmojiData();
                const finalEmojis = Array.isArray(savedEmojiData.REACT_STATUS)
                    ? savedEmojiData.REACT_STATUS
                    : [];

                // Tampilkan hanya 10 emoji pertama, sisanya spoiler
                const displayEmojis = finalEmojis.slice(0, 10);
                const remainingCount = finalEmojis.length - 10;
                let allEmojiDisplay = displayEmojis.join(' ');
                if (remainingCount > 0) {
                    allEmojiDisplay += ` ||dan ${remainingCount} emoji lainnya||`;
                }

                let responseText = `✅ *EMOJI BERHASIL DITAMBAHKAN KE WILY_KUN/LIST_EMOJI/EMOJI.json*\n\n🎭 *Emoji baru ditambah:* ${uniqueNewEmojis.join(' ')}\n📊 *Total emoji tersimpan:* ${finalEmojis.length}\n\n💾 *Emoji aktif sekarang:* ${allEmojiDisplay}\n\n🔄 *Status:* Siap digunakan untuk story reaction`;

                if (duplicates.length > 0) {
                    // Format duplikat dengan spoiler maksimal 10
                    const duplicateDisplayEmojis = duplicates.slice(0, 10);
                    const duplicateRemainingCount = duplicates.length - 10;
                    let duplicateEmojiDisplay = duplicateDisplayEmojis.join(' ');
                    if (duplicateRemainingCount > 0) {
                        duplicateEmojiDisplay += ` ||dan ${duplicateRemainingCount} emoji lainnya||`;
                    }

                    responseText += `\n\n🔍 *DETEKSI EMOJI DUPLIKAT DITEMUKAN:*\n⚠️ *Maaf ada emoji yang udah ada:*\n${duplicateEmojiDisplay}\n\n❌ *Emoji duplikat yang tidak disimpan:*\n${duplicates.slice(0, 10).join(', ')}${duplicates.length > 10 ? ` ||dan ${duplicates.length - 10} lainnya||` : ''}\n\n💡 *Alasan tidak disimpan:*\n• Emoji sudah terdaftar sebelumnya\n• Untuk menghindari data duplikat\n• Menjaga efisiensi database`;
                }

                responseText += `\n\n🎯 *Fitur otomatis aktif:*\n• Bot akan react story dengan emoji random\n• Hanya untuk Owner\n• Emoji dipilih secara acak dari ${finalEmojis.length} pilihan\n• Data tersimpan permanen di WILY_KUN/LIST_EMOJI/EMOJI.json\n• Hanya emoji baru yang berhasil disimpan`;

                await Wily(responseText, m, hisoka);

            } catch (error) {
                console.error('Error saving emoji data:', error);

                // Cek apakah direktori bisa diakses
                const dirPath = path.dirname(emojiPath);
                const dirExists = fs.existsSync(dirPath);
                const fileExists = fs.existsSync(emojiPath);

                let debugInfo = `Path = ${emojiPath}\n`;
                debugInfo += `Directory exists: ${dirExists}\n`;
                debugInfo += `File exists: ${fileExists}\n`;
                debugInfo += `Process CWD: ${process.cwd()}\n`;
                debugInfo += `Full error: ${error.stack}`;

                await Wily(`❌ *GAGAL MENYIMPAN EMOJI KE WILY_KUN/LIST_EMOJI/EMOJI.json*\n\n🔧 Error: ${error.message}\n📁 Pastikan file dan direktori dapat ditulis\n🔄 Coba restart bot jika masalah berlanjut\n\n💡 Debug info:\n${debugInfo}`, m, hisoka);
            }
            return;
        }

        // Handle reaction mode control
        if (['on', 'off', 'random', 'matikan'].includes(actionArg)) {
            const currentMode = config.REACTION_MODE || 'on';

            // Cek jika mode sudah sama
            if (currentMode === actionArg) {
                let currentStatusText = '';
                let currentExplanation = '';

                if (actionArg === 'on') {
                    currentStatusText = '🟢 AKTIF';
                    currentExplanation = 'Bot sudah dalam mode aktif - melihat & react story otomatis';
                } else if (actionArg === 'off') {
                    currentStatusText = '🟡 MELIHAT SAJA';
                    currentExplanation = 'Bot sudah dalam mode melihat saja - tidak memberikan reaction';
                } else if (actionArg === 'random') {
                    currentStatusText = '🎲 RANDOM MODE';
                    currentExplanation = 'Bot sudah dalam mode random - kadang react kadang tidak';
                } else if (actionArg === 'matikan') {
                    currentStatusText = '🔴 DIMATIKAN';
                    currentExplanation = 'Bot sudah dalam mode mati - tidak melihat story sama sekali';
                }

                await Wily(`ℹ️ *FITUR SUDAH DALAM KEADAAN ${currentStatusText}*\n\n📝 *"REACTION_MODE": "${currentMode}"*\n💡 ${currentExplanation}\n\n🔄 *Status:* Tidak ada perubahan yang diperlukan\n⚡ Mode reaction sudah sesuai permintaan\n\n💾 Data di config.json tetap: "${currentMode}"`, m, hisoka);
                return;
            }

            try {
                config.REACTION_MODE = actionArg;
                fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

                // Verifikasi perubahan
                const newConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
                const savedMode = newConfig.REACTION_MODE;

                let modeMessage = '';
                let modeIcon = '';
                let description = '';
                let detailedExplanation = '';

                if (actionArg === 'on') {
                    modeIcon = '🟢';
                    modeMessage = 'AKTIF';
                    description = 'Bot akan melihat story dan memberikan reaction otomatis';
                    detailedExplanation = '✅ Setiap story yang dilihat akan di-react dengan emoji random\n🎯 Bot terlihat aktif dan interaktif\n📱 Reaction menggunakan emoji dari EMOJI.json';
                } else if (actionArg === 'off') {
                    modeIcon = '🟡';
                    modeMessage = 'MELIHAT SAJA';
                    description = 'Bot akan melihat story tetapi tidak memberikan reaction';
                    detailedExplanation = '👀 Story tetap dibaca/dilihat tapi tanpa emoji reaction\n🔇 Mode diam-diam untuk melihat story\n📖 Hanya read story tanpa interaksi';
                } else if (actionArg === 'random') {
                    modeIcon = '🎲';
                    modeMessage = 'RANDOM MODE';
                    description = 'Bot akan random antara react atau hanya melihat story';
                    detailedExplanation = '🎯 50% kemungkinan memberikan reaction\n⚡ Kadang react, kadang hanya melihat\n🎭 Terlihat seperti manusia normal';
                } else if (actionArg === 'matikan') {
                    modeIcon = '🔴';
                    modeMessage = 'DIMATIKAN';
                    description = 'Bot tidak akan melihat story sama sekali';
                    detailedExplanation = '❌ Fitur auto story viewer sepenuhnya nonaktif\n💤 Tidak ada aktivitas story viewing\n🚫 Menghemat bandwidth dan membuat bot diam';
                }

                await Wily(`${modeIcon} *MODE REACTION BERHASIL DIUBAH*\n\n🔄 *Perubahan:* ${currentMode} ➜ ${actionArg}\n✅ *Mode baru:* ${modeMessage}\n📝 *"REACTION_MODE": "${savedMode}"*\n\n📋 *Deskripsi:*\n${description}\n\n🎯 *Detail Fitur:*\n${detailedExplanation}\n\n💾 *Status Penyimpanan:*\n• Data tersimpan permanen di config.json\n• Setting berlaku untuk semua story selanjutnya\n• Khusus untuk Owner\n\n⚡ *Mode aktif sekarang:* ${modeMessage}`, m, hisoka);

            } catch (error) {
                await Wily(`❌ *GAGAL MENGUBAH STATUS*\n\n🔧 Error: ${error.message}\n📁 Pastikan file config.json dapat ditulis\n\n💡 Coba restart bot jika masalah berlanjut`, m, hisoka);
            }
            return;
        }

    } catch (error) {
        await Wily(`❌ Terjadi kesalahan: ${error.message}`, m, hisoka);
    }
}

/**
 * Handler untuk auto reaction story - khusus owner
 */
export async function handleAutoReactionStory(hisoka, m) {
    try {
        // Cek apakah pesan dari status broadcast terlebih dahulu
        if (!m.key || m.key.remoteJid !== 'status@broadcast') {
            return;
        }

        // Skip protocol messages
        if (m.type === 'protocolMessage' && m.message?.protocolMessage?.type === 0) {
            return;
        }

        // Baca config setiap kali untuk memastikan data terbaru
        let config;
        try {
            config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        } catch (configError) {
            console.log('❌ Error membaca config.json:', configError.message);
            return;
        }

        const senderId = m.sender?.split('@')[0] || '';
        const isOwner = config.OWNER && config.OWNER.includes(senderId);

        // Jika bukan owner dan mode self, return
        if (config.SELF === true && !isOwner) {
            return;
        }

        // Cek mode reaction dari config
        const reactionMode = config.REACTION_MODE || 'on';

        // Jika reaction dimatikan, tidak proses sama sekali
        if (reactionMode === 'matikan') {
            return;
        }

        const id = m.key.participant || m.sender || m.key.remoteJid;
        
        // Cegah bot react story sendiri
        const botNumber = hisoka.user?.id?.split(':')[0] || '';
        const storyOwnerNumber = id?.split('@')[0] || '';
        
        if (botNumber === storyOwnerNumber) {
            return;
        }
        const name = hisoka.getName(id) || id?.split('@')[0]?.replace(/^\+/, '') || 'Unknown User';
        const phoneNumber = id?.split('@')[0] || '';
        const sensoredNumber = phoneNumber ? sensorNumber(phoneNumber) : 'Unknown';
        const statusType = getStatusType(m);

        // Ambil delay dari config dengan validasi
        let reactionDelay = parseInt(config.REACTION_DELAY) || 1;
        if (reactionDelay < 1) reactionDelay = 1;
        if (reactionDelay > 60) reactionDelay = 60; // Maksimal 60 detik

        // Tunggu delay sesuai config dengan akurasi tinggi
        const delayMs = reactionDelay * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));

        // Variabel untuk menyimpan status operasi
        let readStatus = '';
        let reactionResult = '';
        let randomEmoji = '';
        let shouldReact = false;

        // Tentukan apakah harus react berdasarkan mode
        if (reactionMode === 'on') {
            shouldReact = true;
        } else if (reactionMode === 'off') {
            shouldReact = false;
        } else if (reactionMode === 'random') {
            // 50% kemungkinan react
            shouldReact = Math.random() < 0.5;
        }

        // Setelah delay, baru baca status
        try {
            await hisoka.readMessages([m.key]);
            readStatus = '✅';
        } catch (readError) {
            readStatus = `❌ Error: ${readError.message}`;
        }

        // Ambil emoji dari config dengan validasi
        const emojiData = readEmojiData();
        let emojis = Array.isArray(emojiData.REACT_STATUS)
            ? emojiData.REACT_STATUS
            : emojiData.REACT_STATUS?.split(',')
                .map(e => e.trim())
                .filter(Boolean);

        // Fallback emoji jika config kosong
        if (emojis.length === 0) {
            emojis = ['❤️', '😍', '😊', '👍', '🔥', '💯', '😂', '🥰'];
        }

        // React dengan emoji random (jika diizinkan)
        if (shouldReact) {
            try {
                randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

                // Validasi key sebelum react
                if (!m.key || !m.key.id || !id) {
                    throw new Error('Invalid message key or participant ID');
                }

                await hisoka.sendMessage(
                    'status@broadcast',
                    {
                        react: { key: m.key, text: randomEmoji },
                    },
                    {
                        statusJidList: [
                            hisoka.user.id.split(':')[0] + '@s.whatsapp.net',
                            id
                        ],
                    }
                );

                reactionResult = '✅';

            } catch (reactionError) {
                console.log('Reaction error details:', reactionError.message);
                reactionResult = '❌ Gagal React';
                randomEmoji = '❌';
            }
        } else {
            // Tidak react
            randomEmoji = '-';
            reactionResult = '⏭️ Dilewati';
        }

        // Log semua informasi dalam format box yang elegant
        const jakartaTime = getWaktu();
        const jakartaGreeting = getSelamat();
        const jakartaHari = getHari();
        const jakartaTanggal = getTanggal();
        const jakartaBulan = getBulan();
        const jakartaTahun = getTahun();

        // Format tanggal dalam format yang diinginkan (Hari|Tanggal|Bulan|Tahun)
        const formattedDate = `${jakartaHari.replace(' 🟢', '').replace(' 🟡', '').replace(' 🔴', '').replace(' 🟠', '').replace(' 🟣', '').replace(' 🟤', '').replace(' 🔵', '')}|${jakartaTanggal.replace(' 📅', '')}|${jakartaBulan.replace(' ❄️', '').replace(' 💕', '').replace(' 🌸', '').replace(' 🌦️', '').replace(' 🌺', '').replace(' ☀️', '').replace(' 🌻', '').replace(' 🌾', '').replace(' 🍂', '').replace(' 🎃', '').replace(' 🦃', '').replace(' 🎄', '')}|${jakartaTahun.replace(' 🗓️', '')}`;

        // Format mode display yang lebih deskriptif
        let statusDisplay = '';
        let modeDisplay = '';
        if (reactionMode === 'on') {
            statusDisplay = 'Aktif ✓';
            modeDisplay = 'REACTION';
        } else if (reactionMode === 'off') {
            statusDisplay = 'Melihat Saja';
            modeDisplay = 'NO REACTION';
        } else if (reactionMode === 'random') {
            statusDisplay = 'Random Mode';
            modeDisplay = 'ACAK';
        } else if (reactionMode === 'matikan') {
            statusDisplay = 'Nonaktif ✗';
            modeDisplay = 'MATI';
        }

        // Format reaction status berdasarkan mode dari config
        let finalStatus = '';
        if (reactionMode === 'on') {
            if (shouldReact && reactionResult === '✅') {
                finalStatus = 'Dilihat & Disukai';
            } else if (reactionResult.includes('❌')) {
                finalStatus = 'Error Reaction';
            } else {
                finalStatus = 'Dilihat & Disukai';
            }
        } else if (reactionMode === 'off') {
            finalStatus = 'Hanya Dilihat';
        } else if (reactionMode === 'random') {
            if (shouldReact && reactionResult === '✅') {
                finalStatus = 'Dilihat & Disukai';
            } else if (!shouldReact && reactionResult === '⏭️ Dilewati') {
                finalStatus = 'Hanya Dilihat';
            } else if (reactionResult.includes('❌')) {
                finalStatus = 'Error Reaction';
            } else {
                finalStatus = 'Random Mode';
            }
        } else if (reactionMode === 'matikan') {
            finalStatus = 'Tidak Melihat';
        } else {
            finalStatus = 'Unknown Status';
        }

        // Format tipe status yang lebih sederhana
        let simpleStatusType = '';
        if (statusType.includes('Gambar')) simpleStatusType = 'Foto';
        else if (statusType.includes('Video')) simpleStatusType = 'Video';
        else if (statusType.includes('Teks')) simpleStatusType = 'Teks';
        else if (statusType.includes('Audio')) simpleStatusType = 'Audio';
        else if (statusType.includes('Sticker')) simpleStatusType = 'Sticker';
        else if (statusType.includes('Dokumen')) simpleStatusType = 'Dokumen';
        else if (statusType.includes('Kontak')) simpleStatusType = 'Kontak';
        else if (statusType.includes('Lokasi')) simpleStatusType = 'Lokasi';
        else simpleStatusType = 'Media';

        // Format waktu dalam format 12 jam dengan WIB
        const timeString = jakartaTime.replace(' ⏰', '').toLowerCase() + ' wib';

        // Display log dalam format box yang elegant
        console.log(`\n╭══════════════════════════════════╮`);
        console.log(`║ 💌 STATUS UPDATE MASUK           ║`);
        console.log(`├══════════════════════════════════┤`);
        console.log(`│ » Status      : ${statusDisplay}`);
        console.log(`│ » Tanggal     : ${formattedDate}`);
        console.log(`│ » Selamat     : ${jakartaGreeting}`);
        console.log(`│ » Waktu       : ${timeString}`);
        console.log(`│ » Speed Views : ${reactionDelay} Detik`);
        console.log(`│ » Nama        : ${name}`);
        console.log(`│ » Nomor       : ${sensoredNumber}`);
        console.log(`│ » Tipe Status : ${simpleStatusType}`);
        console.log(`│ » Reaction    : ${shouldReact ? 'ON' : 'OFF'}`);
        console.log(`│ » Mode        : ${modeDisplay}`);
        console.log(`│ » Reaksi      : ${randomEmoji}`);
        console.log(`│ » Status      : ${finalStatus}`);
        console.log(`└───···`);

    } catch (error) {
        console.log('❌ Error auto reaction story:', error.message);
    }
}

// Export fungsi utama sebagai reaction
export { handleReactionCommand as reaction };

// Export untuk digunakan di message.js
export const reactionInfo = {
    command: ['reaction'],
    description: 'Mengatur emoji reaction untuk story WhatsApp'
};