import fs from 'fs';
import path from 'path';
import { Wily } from '../../CODE_REPLY/reply.js';

// Fungsi untuk membuat backup config
function createBackup() {
    try {
        const dataDir = './DATA';
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(dataDir, `config-backup-${timestamp}.json`);
        const configData = fs.readFileSync('./config.json', 'utf8');

        fs.writeFileSync(backupFile, configData);

        // Jaga hanya 10 backup terbaru untuk menghemat space
        const backupFiles = fs.readdirSync(dataDir)
            .filter(file => file.startsWith('config-backup-') && file.endsWith('.json'))
            .sort()
            .reverse();

        if (backupFiles.length > 10) {
            backupFiles.slice(10).forEach(file => {
                try {
                    fs.unlinkSync(path.join(dataDir, file));
                } catch (err) {
                    // Silent error untuk cleanup backup lama
                }
            });
        }

        return true;
    } catch (error) {
        console.error('Backup error:', error.message);
        return false;
    }
}

// Fungsi untuk mengubah auto typing
function changeAutoTyping(newStatus) {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

        // Backup sebelum mengubah
        createBackup();

        // Update auto typing status
        config.AUTO_TYPING = newStatus;

        // Simpan config yang sudah diupdate
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

        return true;
    } catch (error) {
        return false;
    }
}

export async function handleTypingCommand(m, { hisoka, text, command }) {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const senderNumber = m.sender.split('@')[0];

        // Cek apakah user adalah owner
        if (!config.OWNER.includes(senderNumber)) {
            if (!config.SELF && config.mode === 'public') {
                await Wily('🚫 *Maaf, fitur ini khusus untuk Owner Bot*\n\n💡 Hanya Owner yang dapat mengatur auto typing\n\n🔒 Akses terbatas untuk menjaga keamanan bot\n\n✨ Terima kasih atas pengertiannya!', m, hisoka);
            }
            return;
        }

        const args = text.trim().split(' ').filter(arg => arg.length > 0);
        const typingArg = args[0]?.toLowerCase(); // Ambil langsung dari args[0] karena text sudah tanpa prefix

        // Handle set duration command
        if (typingArg === 'set') {
            const durationInput = args[1];

            // Cek apakah input ada
            if (!durationInput || durationInput.trim() === '') {
                await Wily(`❌ *DURASI TIDAK DIMASUKKAN*\n\n📋 *Cara penggunaan:*\n• \`.typing set [1-10]\` - Set durasi typing\n\n💡 *Contoh:*\n• \`.typing set 3\` - Set 3 detik\n• \`.typing set 5\` - Set 5 detik\n\n⚠️ Durasi harus antara 1-10 detik`, m, hisoka);
                return;
            }

            const duration = parseInt(durationInput);

            // Validasi yang lebih akurat
            if (isNaN(duration) || duration < 1 || duration > 10) {
                await Wily(`❌ *DURASI TIDAK VALID*\n\n🔢 Input yang diterima: "${durationInput}"\n📊 Nilai yang diproses: ${isNaN(duration) ? 'Bukan angka' : duration}\n\n📋 *Cara penggunaan:*\n• \`.typing set [1-10]\` - Set durasi typing\n\n💡 *Contoh:*\n• \`.typing set 1\` - Set 1 detik\n• \`.typing set 5\` - Set 5 detik\n• \`.typing set 10\` - Set 10 detik\n\n⚠️ Durasi harus berupa angka antara 1-10 detik`, m, hisoka);
                return;
            }

            // Update durasi di config
            try {
                // Backup dulu sebelum mengubah
                createBackup();

                // Update config dengan durasi baru
                config.TYPING_DURATION = duration;

                // Simpan ke file config.json
                fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

                // Verifikasi data tersimpan dengan membaca ulang config
                const verifyConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
                const savedDuration = verifyConfig.TYPING_DURATION;

                if (savedDuration === duration) {
                    await Wily(`⏱️ *DURASI TYPING BERHASIL DIUBAH*\n\n🔄 Durasi baru: *${duration} detik*\n📝 Keterangan: Bot akan typing selama ${duration} detik saat ada pesan masuk\n\n✅ Data tersimpan ke config.json (verified: ${savedDuration}s)\n💾 Backup dibuat di folder DATA\n⚡ Perubahan langsung aktif\n\n🔍 *Status:* Konfigurasi berhasil disimpan dan diverifikasi`, m, hisoka);
                } else {
                    await Wily(`⚠️ *PERINGATAN*\n\nDurasi diset: ${duration} detik\nTersimpan: ${savedDuration} detik\n\n❌ Terjadi ketidaksesuaian data, silakan coba lagi`, m, hisoka);
                }
            } catch (error) {
                await Wily(`❌ *GAGAL MENGUBAH DURASI*\n\n🔧 Error: ${error.message}\n📁 Pastikan file config.json dapat ditulis\n🔐 Periksa permission folder\n\n💡 Coba restart bot jika masalah berlanjut`, m, hisoka);
            }
            return;
        }

        // Jika tidak ada argument, tampilkan status
        if (!typingArg || !['on', 'off', 'set'].includes(typingArg)) {
            // Baca config terbaru lagi
            const latestConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
            const currentStatus = latestConfig.AUTO_TYPING === true ? 'ON' : 'OFF';
            const duration = latestConfig.TYPING_DURATION || 3;

            await Wily(`⌨️ *AUTO TYPING STATUS*\n\n🔹 Status saat ini: *${currentStatus}*\n⏱️ Durasi typing: ${duration} detik\n\n📋 *Cara penggunaan:*\n• \`.typing on\` - Aktifkan auto typing\n• \`.typing off\` - Matikan auto typing\n• \`.typing set [1-10]\` - Atur durasi typing\n\n💡 *Contoh:*\n• \`.typing set 3\` - Set durasi 3 detik\n• \`.typing set 5\` - Set durasi 5 detik\n\n💡 *Keterangan:*\n• Auto typing akan aktif saat ada pesan masuk\n• Berlaku untuk private chat dan group\n• Durasi maksimal 10 detik\n\n⚙️ Data tersimpan otomatis ke config.json\n📁 Backup dibuat di folder DATA`, m, hisoka);
            return;
        }

        const currentStatus = config.AUTO_TYPING === true;
        const newStatus = typingArg === 'on';

        // Cek jika status sudah sama
        if (currentStatus === newStatus) {
            await Wily(`ℹ️ Auto typing sudah dalam keadaan *${typingArg.toUpperCase()}*`, m, hisoka);
            return;
        }

        // Ubah status
        const success = changeAutoTyping(newStatus);

        if (success) {
            // Verifikasi perubahan dengan membaca config lagi
            const newConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
            const actualStatus = newConfig.AUTO_TYPING ? 'ON' : 'OFF';
            const duration = newConfig.TYPING_DURATION || 3;

            const emoji = newStatus ? '⌨️' : '🔕';
            const description = newStatus 
                ? `Bot akan otomatis typing saat ada pesan masuk (${duration} detik)`
                : 'Bot tidak akan menampilkan typing indicator';

            await Wily(`${emoji} *AUTO TYPING BERHASIL DIUBAH*\n\n🔄 Status: *${currentStatus ? 'ON' : 'OFF'}* ➜ *${actualStatus}*\n📝 Keterangan: ${description}\n\n✅ Konfigurasi tersimpan ke config.json\n💾 Backup dibuat di folder DATA\n⚡ Bot terus berjalan tanpa restart\n\n🔍 *Verifikasi:* Auto typing sekarang ${actualStatus}`, m, hisoka);
        } else {
            await Wily('❌ Gagal mengubah auto typing. Pastikan file config.json dapat ditulis.', m, hisoka);
        }

    } catch (error) {
        await Wily(`❌ Terjadi kesalahan: ${error.message}`, m, hisoka);
    }
}

// Export untuk digunakan di message.js
export const typingInfo = {
    command: ['typing'],
    description: 'Mengatur auto typing bot saat ada pesan masuk'
};

// Export fungsi utama sebagai typing
export const typing = handleTypingCommand;