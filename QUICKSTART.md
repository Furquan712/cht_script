# 🚀 Quick Start Guide

## ⚡ 60 Second Setup

### 1️⃣ Install
```bash
npm install
```

### 2️⃣ Build
```bash
npm run build
```

### 3️⃣ Test Locally
```bash
# Start backend first
cd ../backend && npm start

# In another terminal
cd ../client
open test.html
```

### 4️⃣ Integrate
```html
<!-- Add to your website -->
<script src="https://cdn.yourdomain.com/cnvrtss.bundle.min.js?cid=YOUR_OWNER_ID"></script>
```

---

## 📋 Common Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Production build |
| `npm run dev:build` | Development build |
| `npm run deploy` | Deploy to production |

---

## 🔧 Configuration

### Local Testing
```javascript
window.ChatbotConfig = {
  socketUrl: 'http://localhost:3001',
  ownerId: 'YOUR_OWNER_ID'
};
```

### Production
```javascript
window.ChatbotConfig = {
  socketUrl: 'https://api.yourdomain.com',
  ownerId: 'YOUR_OWNER_ID'
};
```

---

## 🐛 Quick Debug

1. **Open browser console** (F12 or Cmd+Option+I)
2. **Look for**: `[chat widget] ✅ connected to socket`
3. **Check debug display** on test page
4. **Verify backend**: `lsof -ti:3001`

---

## 📚 Full Documentation

See [README.md](./README.md) for complete documentation.

---

## ⚠️ Troubleshooting

### Getting "Echo" responses?
- ✅ Backend running: `cd ../backend && npm start`
- ✅ Socket connected: Check debug display
- ✅ Owner ID set: Verify in config

### Widget not showing?
- ✅ Build completed: `npm run build`
- ✅ File exists: `ls dist/cnvrtss.bundle.min.js`
- ✅ Path correct: Check script src in HTML

### Socket won't connect?
- ✅ Backend running on port 3001
- ✅ CORS configured in backend
- ✅ Socket URL matches backend URL
