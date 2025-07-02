
const fs = require('fs');
const path = require('path');
const { colors, style } = require('./CODE_WARNA/colors');
const readline = require('readline');

const SECURITY_URL = 'https://raw.githubusercontent.com/hitlabmodv2/SECURITY/refs/heads/main/VERSION%207.0.0%20AUTO%20REACTION%20STORY%20%2B%20MD%20SELF%20OR%20PUBLIC.json';
const AUTH_FILE = './database/auth.json';

// Pastikan folder database ada
if (!fs.existsSync('./database')) {
    fs.mkdirSync('./database', { recursive: true });
}

const checkPassword = async () => {
    try {
        // Ambil password dari GitHub
        const response = await fetch(SECURITY_URL);
        if (!response.ok) throw new Error('Gagal mengakses GitHub');
        
        const text = await response.text();
        
        // Parse password dari format PASSWORD=value atau JSON
        let currentPassword;
        if (text.includes('PASSWORD=')) {
            // Format: PASSWORD=Bangwily
            const match = text.match(/PASSWORD=(.+)/);
            currentPassword = match ? match[1].trim() : null;
        } else {
            // Format JSON
            try {
                const data = JSON.parse(text);
                currentPassword = data.PASSWORD;
            } catch {
                throw new Error('Format file GitHub tidak valid');
            }
        }
        
        if (!currentPassword) throw new Error('Password tidak ditemukan di file GitHub');
        
        // Cek apakah sudah pernah login dengan password yang benar
        let authData = {};
        if (fs.existsSync(AUTH_FILE)) {
            authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
        }
        
        // Jika password berubah atau belum pernah login
        if (!authData.password || authData.password !== currentPassword) {
            console.log(style.warning(`
🔐 ${colors.cyan}SECURITY CHECK${colors.reset}

🔒 Status: Password diperlukan
${authData.password ? '🔄 Password telah berubah!' : '🆕 Autentikasi pertama kali'}
`));
            
            return await promptPassword(currentPassword);
        }
        
        console.log(style.success(`
✅ ${colors.green}SECURITY VALID${colors.reset}

✅ Status: Password masih valid
🔐 Mode: Auto login
`));
        
        return true;
        
    } catch (error) {
        console.log(style.error(`
❌ ${colors.red}SECURITY ERROR${colors.reset}

💥 Error: ${error.message}
🚫 Bot tidak dapat berjalan
`));
        process.exit(1);
    }
};

const promptPassword = (correctPassword) => {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question(style.info('🔑 Masukkan password: '), (inputPassword) => {
            rl.close();
            
            if (inputPassword.trim() === correctPassword) {
                // Simpan password yang benar ke database
                const authData = { 
                    password: correctPassword,
                    lastLogin: new Date().toISOString()
                };
                fs.writeFileSync(AUTH_FILE, JSON.stringify(authData, null, 2));
                
                console.log(style.success(`
✅ ${colors.green}PASSWORD BENAR${colors.reset}

✅ Status: Autentikasi berhasil
💾 Disimpan ke database
`));
                resolve(true);
            } else {
                console.log(style.error(`
❌ ${colors.red}PASSWORD SALAH${colors.reset}

🚫 Status: Password tidak cocok
⛔ Bot akan berhenti
`));
                process.exit(1);
            }
        });
    });
};

const startPasswordMonitor = () => {
    setInterval(async () => {
        try {
            const response = await fetch(SECURITY_URL);
            if (!response.ok) return;
            
            const text = await response.text();
            
            // Parse password dari format PASSWORD=value atau JSON
            let currentPassword;
            if (text.includes('PASSWORD=')) {
                const match = text.match(/PASSWORD=(.+)/);
                currentPassword = match ? match[1].trim() : null;
            } else {
                try {
                    const data = JSON.parse(text);
                    currentPassword = data.PASSWORD;
                } catch {
                    return; // Skip jika format tidak valid
                }
            }
            
            if (!currentPassword) return;
            
            if (fs.existsSync(AUTH_FILE)) {
                const authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
                
                if (authData.password !== currentPassword) {
                    console.log(style.warning(`
⚠️ ${colors.yellow}PASSWORD BERUBAH${colors.reset}

🔄 Status: Password telah diperbarui
🔒 Bot akan berhenti untuk keamanan
`));
                    process.exit(1);
                }
            }
        } catch (error) {
            console.log(style.info('🔍 Pengecekan password gagal:'), error.message);
        }
    }, 60000); // Cek setiap 1 menit
};

module.exports = { 
    checkPassword, 
    startPasswordMonitor 
};
