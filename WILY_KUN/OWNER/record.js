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
        return false;
    }
}

export async function handleRecordCommand(m, { hisoka, text, command }) {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const senderNumber = m.sender.split('@')[0];

        // Cek apakah pengirim adalah owner
        if (!config.OWNER.includes(senderNumber)) {
            // Jika mode public dan bukan owner, berikan respon sopan
            if (config.mode === 'public') {
                await Wily(`🔒 *AKSES DITOLAK*\n\n❌ Maaf, fitur ini khusus untuk owner bot\n👤 Hanya owner yang dapat menggunakan perintah ini\n\n💡 Hubungi owner jika ada keperluan khusus`, m, hisoka);
            }
            return;
        }

        const args = text.trim().split(' ').filter(arg => arg.length > 0);
        const recordArg = args[0]?.toLowerCase();

        // Handle set duration command
        if (recordArg === 'set') {
            const durationInput = args[1];

            // Cek apakah input ada
            if (!durationInput || durationInput.trim() === '') {
                await Wily(`❌ *DURASI TIDAK DIMASUKKAN*\n\n📋 *Cara penggunaan:*\n• \`.record set [1-10]\` - Set durasi record\n\n💡 *Contoh:*\n• \`.record set 3\` - Set 3 detik\n• \`.record set 5\` - Set 5 detik\n\n⚠️ Durasi harus antara 1-10 detik`, m, hisoka);
                return;
            }

            const duration = parseInt(durationInput);

            // Validasi yang lebih akurat
            if (isNaN(duration) || duration < 1 || duration > 10) {
                await Wily(`❌ *DURASI TIDAK VALID*\n\n🔢 Input yang diterima: "${durationInput}"\n📊 Nilai yang diproses: ${isNaN(duration) ? 'Bukan angka' : duration}\n\n📋 *Cara penggunaan:*\n• \`.record set [1-10]\` - Set durasi record\n\n💡 *Contoh:*\n• \`.record set 1\` - Set 1 detik\n• \`.record set 5\` - Set 5 detik\n• \`.record set 10\` - Set 10 detik\n\n⚠️ Durasi harus berupa angka antara 1-10 detik`, m, hisoka);
                return;
            }

            // Update durasi di config
            try {
                // Backup dulu sebelum mengubah
                createBackup();

                // Update config dengan durasi baru
                config.RECORD_DURATION = duration;

                // Simpan ke file config.json
                fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

                // Verifikasi data tersimpan dengan membaca ulang config
                const verifyConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
                const savedDuration = verifyConfig.RECORD_DURATION;

                if (savedDuration === duration) {
                    await Wily(`🎙️ *DURASI RECORD BERHASIL DIUBAH*\n\n🔄 Durasi baru: *${duration} detik*\n📝 Keterangan: Bot akan record selama ${duration} detik saat ada pesan masuk\n\n✅ Data tersimpan ke config.json (verified: ${savedDuration}s)\n💾 Backup dibuat di folder DATA\n⚡ Perubahan langsung aktif\n\n🔍 *Status:* Konfigurasi berhasil disimpan dan diverifikasi`, m, hisoka);
                } else {
                    await Wily(`⚠️ *PERINGATAN*\n\nDurasi diset: ${duration} detik\nTersimpan: ${savedDuration} detik\n\n❌ Terjadi ketidaksesuaian data, silakan coba lagi`, m, hisoka);
                }
            } catch (error) {
                await Wily(`❌ *GAGAL MENGUBAH DURASI*\n\n🔧 Error: ${error.message}\n📁 Pastikan file config.json dapat ditulis\n🔐 Periksa permission folder\n\n💡 Coba restart bot jika masalah berlanjut`, m, hisoka);
            }
            return;
        }

        // Jika tidak ada argumen, tampilkan status
        if (!recordArg || !['on', 'off', 'set'].includes(recordArg)) {
            // Baca config terbaru lagi
            const latestConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
            const currentStatus = latestConfig.AUTO_RECORD ? '🟢 Aktif' : '🔴 Nonaktif';
            const duration = latestConfig.RECORD_DURATION || 3;

            await Wily(`🎙️ *STATUS AUTO RECORD*\n\n📊 Status saat ini: ${currentStatus}\n⏱️ Durasi record: ${duration} detik\n\n📋 *Perintah yang tersedia:*\n• \`.record on\` - Aktifkan auto record\n• \`.record off\` - Matikan auto record\n• \`.record set [1-10]\` - Atur durasi record\n\n💡 *Contoh:*\n• \`.record set 3\` - Set durasi 3 detik\n• \`.record set 5\` - Set durasi 5 detik\n\n💡 *Keterangan:*\n• Auto record akan aktif saat ada pesan masuk\n• Berlaku untuk private chat dan group\n• Durasi maksimal 10 detik\n\n⚙️ Data tersimpan otomatis ke config.json\n📁 Backup dibuat di folder DATA`, m, hisoka);
            return;
        }

        // Handle command on/off
        if (recordArg === 'on') {
            try {
                createBackup();

                config.AUTO_RECORD = true;
                fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

                // Verifikasi data tersimpan
                const verifyConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
                const savedStatus = verifyConfig.AUTO_RECORD;

                if (savedStatus === true) {
                    const duration = verifyConfig.RECORD_DURATION || 3;
                    await Wily(`🎙️ *AUTO RECORD DIAKTIFKAN*\n\n✅ Status: Aktif\n⏱️ Durasi: ${duration} detik\n📱 Bot akan mengirim status record saat ada pesan masuk\n\n💾 Konfigurasi tersimpan ke config.json\n🔄 Backup dibuat di folder DATA\n⚡ Perubahan langsung aktif tanpa restart`, m, hisoka);
                } else {
                    await Wily(`⚠️ *PERINGATAN*\n\nStatus diset: aktif\nTersimpan: ${savedStatus}\n\n❌ Terjadi ketidaksesuaian data, silakan coba lagi`, m, hisoka);
                }
            } catch (error) {
                await Wily(`❌ *GAGAL MENGAKTIFKAN AUTO RECORD*\n\n🔧 Error: ${error.message}\n📁 Pastikan file config.json dapat ditulis\n🔐 Periksa permission folder\n\n💡 Coba restart bot jika masalah berlanjut`, m, hisoka);
            }
            return;
        }

        if (recordArg === 'off') {
            try {
                createBackup();

                config.AUTO_RECORD = false;
                fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

                // Verifikasi data tersimpan
                const verifyConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
                const savedStatus = verifyConfig.AUTO_RECORD;

                if (savedStatus === false) {
                    await Wily(`🎙️ *AUTO RECORD DINONAKTIFKAN*\n\n❌ Status: Nonaktif\n📱 Bot tidak akan mengirim status record lagi\n\n💾 Konfigurasi tersimpan ke config.json\n🔄 Backup dibuat di folder DATA\n⚡ Perubahan langsung aktif tanpa restart`, m, hisoka);
                } else {
                    await Wily(`⚠️ *PERINGATAN*\n\nStatus diset: nonaktif\nTersimpan: ${savedStatus}\n\n❌ Terjadi ketidaksesuaian data, silakan coba lagi`, m, hisoka);
                }
            } catch (error) {
                await Wily(`❌ *GAGAL MENONAKTIFKAN AUTO RECORD*\n\n🔧 Error: ${error.message}\n📁 Pastikan file config.json dapat ditulis\n🔐 Periksa permission folder\n\n💡 Coba restart bot jika masalah berlanjut`, m, hisoka);
            }
            return;
        }

        // Jika command tidak dikenali
        await Wily(`❌ *PERINTAH TIDAK DIKENALI*\n\n📋 Cara penggunaan:\n• \`.record on\` - Aktifkan auto record\n• \`.record off\` - Matikan auto record\n• \`.record set [1-10]\` - Atur durasi record\n\n💡 Contoh:\n• \`.record on\` - Untuk mengaktifkan\n• \`.record off\` - Untuk menonaktifkan\n• \`.record set 5\` - Set durasi 5 detik\n\n🔍 Gunakan \`.record\` tanpa parameter untuk melihat status`, m, hisoka);
    } catch (error) {
        await Wily(`❌ Terjadi kesalahan: ${error.message}`, m, hisoka);
    }
}

export const recordInfo = {
    command: ['record'],
    description: 'Mengatur auto record saat ada pesan masuk'
};

// Export fungsi utama sebagai record
export const record = handleRecordCommand;