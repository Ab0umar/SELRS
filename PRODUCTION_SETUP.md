# Production Setup Guide - Attendance Module

**Status:** Ready for Production Deployment  
**Version:** 2.0  
**Last Updated:** 2026-05-20

---

## 1. Pre-Deployment Checklist

### Infrastructure Requirements
- [ ] Server: Windows Server 2019+ or Windows 10 Pro+
- [ ] RAM: Minimum 8GB (16GB recommended)
- [ ] Disk: 50GB free space (for logs, backups, data)
- [ ] Network: Stable LAN connection to device at 192.168.0.10:5005
- [ ] Database: MySQL 8.0+ running and accessible
- [ ] Node.js: v18+ with npm/pnpm

### Device Configuration
- [ ] Fingerprint device online and responsive
- [ ] Device IP verified: 192.168.0.10
- [ ] Device port confirmed: 5005
- [ ] Device accessible from app server (ping 192.168.0.10)
- [ ] FKOldLogPuller.exe available at D:\Programs\fp\
- [ ] FK DLLs present in C:\Windows\SysWOW64\

### Database Setup
- [ ] MySQL running on 3306
- [ ] attendance_* tables created (from drizzle schema)
- [ ] Backup schedule configured
- [ ] Database user created with proper permissions
- [ ] Database connection tested

### Application Setup
- [ ] App downloaded/cloned to deployment directory
- [ ] Dependencies installed (`pnpm install`)
- [ ] Environment variables configured (.env.production)
- [ ] Build successful (`pnpm build`)
- [ ] Tests passing (`pnpm test`)

---

## 2. Environment Configuration

### Create `.env.production`

```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=srv100_attendance
DB_PASSWORD=<strong-password>
DB_NAME=srv100_attendance

# Server
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Attendance Device
DEVICE_IP=192.168.0.10
DEVICE_PORT=5005
DEVICE_TIMEOUT=5000
FK_PULLER_PATH=D:\Programs\fp\FKOldLogPuller.exe

# Sync Schedule
SYNC_INTERVAL_MINUTES=30
ENABLE_AUTO_SYNC=true

# Push Listener (Phase 3)
PUSH_LISTENER_PORT=7005
ENABLE_PUSH_LISTENER=false

# Logging
LOG_DIR=./logs
LOG_MAX_FILES=30
LOG_MAX_SIZE=10m

# Security
JWT_SECRET=<generate-random-secret>
SESSION_SECRET=<generate-random-secret>

# Monitoring
SENTRY_DSN=<optional-error-tracking>
HEALTH_CHECK_INTERVAL=300000
```

### Database User Setup

```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create database
CREATE DATABASE srv100_attendance 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER 'srv100_attendance'@'localhost' 
IDENTIFIED BY '<strong-password>';

-- Grant permissions
GRANT ALL PRIVILEGES ON srv100_attendance.* 
TO 'srv100_attendance'@'localhost';

FLUSH PRIVILEGES;
```

---

## 3. Database Migration

### Initialize Schema

```bash
# From project directory
cd D:\C\SRV100_Acc

# Run migrations (if using migration system)
npx drizzle-kit migrate

# Or if migrations not set up, ensure tables exist:
# Tables created: attendancePunches, attendanceDaily, attendanceSyncRuns, etc.
# Verify with:
mysql -u srv100_attendance -p srv100_attendance -e "SHOW TABLES;"
```

### Initialize Data

```bash
# Run initialization script
npx tsx scripts/init-attendance.ts
```

Create `scripts/init-attendance.ts`:

```typescript
import { getDb } from '../server/db';

async function init() {
  const db = await getDb();
  
  console.log('Initializing attendance module...');
  
  // Create device settings
  await db.insert(attendanceDeviceSettings).values({
    id: 1,
    enabled: true,
    ip: '192.168.0.10',
    port: 5005,
    protocol: 0,
    fallbackToAccess: false,
    realTimeSync: false,
  });
  
  console.log('✓ Device settings created');
  
  // Create default shifts
  await db.insert(attendanceShifts).values({
    name: 'Standard',
    startTime: '09:00',
    endTime: '17:00',
    breakMinutes: 60,
    isActive: true,
  });
  
  console.log('✓ Default shift created');
  
  // Record first sync run
  await db.insert(attendanceSyncRuns).values({
    startedAt: new Date(),
    finishedAt: new Date(),
    source: 'initialization',
    trigger: 'manual',
    status: 'ok',
    rowsSeen: 0,
    rowsInserted: 0,
    rowsSkipped: 0,
  });
  
  console.log('✓ Initialization complete');
  process.exit(0);
}

init().catch(e => {
  console.error('Initialization failed:', e);
  process.exit(1);
});
```

---

## 4. Deployment Steps

### Step 1: Prepare Server

```bash
# SSH to production server
ssh user@production-server

# Create directory
mkdir -p /opt/srv100-attendance
cd /opt/srv100-attendance

# Verify Node.js
node --version  # Should be v18+
npm --version   # or pnpm --version
```

### Step 2: Deploy Application

```bash
# Download/clone code
git clone <repo-url> .
# OR
unzip srv100-attendance-v2.0.zip

# Install dependencies
pnpm install

# Create .env.production
cp .env.example .env.production
# Edit with your values
nano .env.production
```

### Step 3: Build & Test

```bash
# Build production bundle
pnpm build

# Run type check
pnpm check

# Run tests (if applicable)
pnpm test

# Verify build output
ls -lh dist/
```

### Step 4: Database Setup

```bash
# Initialize database
npx tsx scripts/init-attendance.ts

# Verify tables
mysql -u srv100_attendance -p srv100_attendance -e "SHOW TABLES;" | grep attendance

# Check sample data
mysql -u srv100_attendance -p srv100_attendance -e "SELECT * FROM attendanceDeviceSettings;"
```

### Step 5: Test Device Connection

```bash
# Test FK device connection
npx tsx scripts/test-fk-puller.ts

# Should output:
# ✓ Device connected successfully
# ✓ Retrieved XXXXX punch records
```

### Step 6: Start Application

```bash
# Option A: Direct (for testing)
pnpm start

# Option B: PM2 (for production)
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Option C: Systemd service (recommended)
# See: Section 6
```

---

## 5. PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'srv100-attendance',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'dist'],
    max_restarts: 10,
    min_uptime: '10s',
  }]
};
```

---

## 6. Systemd Service (Recommended)

Create `/etc/systemd/system/srv100-attendance.service`:

```ini
[Unit]
Description=SRV100 Attendance Module
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=srv100
WorkingDirectory=/opt/srv100-attendance
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /opt/srv100-attendance/dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security
PrivateTmp=yes
NoNewPrivileges=yes
ReadOnlyPaths=/etc
ReadWritePaths=/opt/srv100-attendance/logs

[Install]
WantedBy=multi-user.target
```

Enable & start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable srv100-attendance
sudo systemctl start srv100-attendance
sudo systemctl status srv100-attendance
```

---

## 7. Health Checks & Monitoring

### Endpoint Health Check

```typescript
// GET /health
// Returns:
{
  status: 'ok',
  timestamp: '2026-05-20T14:30:00Z',
  uptime: 3600,
  database: 'connected',
  device: 'reachable',
  version: '2.0.0'
}
```

### Monitoring Script

Create `scripts/monitor.ts`:

```typescript
import axios from 'axios';

async function healthCheck() {
  try {
    const response = await axios.get('http://localhost:3000/health');
    const health = response.data;
    
    if (health.status === 'ok' && health.database === 'connected') {
      console.log('✓ System healthy');
      process.exit(0);
    } else {
      console.error('✗ Health check failed:', health);
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Health check error:', error.message);
    process.exit(1);
  }
}

healthCheck();
```

Run via cron:

```bash
*/5 * * * * cd /opt/srv100-attendance && npx tsx scripts/monitor.ts >> logs/monitor.log 2>&1
```

---

## 8. Logging & Troubleshooting

### Log Files

```
logs/
├── error.log          # Errors and warnings
├── sync.log           # Sync operations
├── device.log         # Device communication
└── access.log         # HTTP requests
```

### View Logs

```bash
# Real-time tail
tail -f logs/error.log

# Last 100 lines
tail -n 100 logs/sync.log

# Search for errors
grep "ERROR" logs/error.log | tail -20

# Systemd logs
sudo journalctl -u srv100-attendance -f
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Device unreachable | Check IP (ping 192.168.0.10), verify port 5005 open |
| Database error | Check credentials in .env, verify MySQL running |
| Port already in use | Change PORT in .env, or kill process: `lsof -i :3000` |
| Permission denied | Run as correct user, check file ownership |
| Out of memory | Increase heap: `NODE_OPTIONS="--max-old-space-size=2048"` |

---

## 9. Backup & Recovery

### Automated Daily Backup

Create `scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/attendance"
DB_NAME="srv100_attendance"
DB_USER="srv100_attendance"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME \
  | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Application backup
tar -czf $BACKUP_DIR/app_$DATE.tar.gz \
  --exclude=node_modules \
  --exclude=logs \
  --exclude=.git \
  /opt/srv100-attendance

# Keep last 30 days
find $BACKUP_DIR -mtime +30 -delete

echo "Backup complete: $DATE"
```

Schedule via cron:

```bash
# Daily at 2am
0 2 * * * bash /opt/srv100-attendance/scripts/backup.sh >> /opt/backups/backup.log 2>&1
```

### Recovery Procedure

```bash
# Stop service
sudo systemctl stop srv100-attendance

# Restore database
gunzip < /opt/backups/attendance/db_20260520_020000.sql.gz | mysql -u srv100_attendance -p srv100_attendance

# Restore application
cd /opt && tar -xzf /opt/backups/attendance/app_20260520_020000.tar.gz

# Restart service
sudo systemctl start srv100-attendance
```

---

## 10. Performance Tuning

### MySQL Optimization

```sql
-- For large punch tables, add indexes
ALTER TABLE attendance_punches 
  ADD INDEX idx_emp_date (empCd, punchAt),
  ADD INDEX idx_source_hash (sourceHash);

-- Optimize table
OPTIMIZE TABLE attendance_punches;
```

### Node.js Tuning

```bash
# Production environment variables
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable clustering (already in PM2 config)
# Use node-inspect for debugging if needed
```

### Database Connection Pooling

Already configured in `server/db.ts`:
- Max connections: 10
- Min connections: 2
- Connection timeout: 30s

---

## 11. Security Checklist

- [ ] SSL/TLS certificate installed (if accessible remotely)
- [ ] Firewall rules: 
  - [ ] Port 3000 blocked from internet (use reverse proxy)
  - [ ] Port 5005 open to device only
  - [ ] Port 7005 open to device only (future)
- [ ] Database:
  - [ ] User password strong (16+ chars, mixed case/numbers)
  - [ ] Remote MySQL access disabled
  - [ ] Regular backups encrypted
- [ ] Application:
  - [ ] JWT_SECRET changed from default
  - [ ] SESSION_SECRET changed from default
  - [ ] No debug logs in production
  - [ ] Error messages don't expose internals
- [ ] Files:
  - [ ] .env.production not in git
  - [ ] Logs directory not world-readable
  - [ ] Database backups encrypted

---

## 12. User Guide for Admins

### Web UI Access

1. Open browser: `http://localhost:3000`
2. Login with admin credentials
3. Navigate to Attendance module

### Manual Sync

**Via Web UI:**
```
Attendance → Settings → Device
Click: "Sync Now"
Wait for confirmation
Check: Dashboard updates
```

**Via API:**
```bash
curl -X POST http://localhost:3000/api/attendance/syncFromFKDevice \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

### Monitor Sync Status

```
Attendance → Reports → Sync History
- Date/Time
- Records imported
- Records skipped
- Duration
- Status (Success/Failed)
```

### Troubleshoot Device

```
Attendance → Settings → Device Diagnostics
Click: "Test Connection"
Results:
- TCP connection
- Device response
- Device info
```

---

## 13. Success Criteria

After deployment, verify:

- [ ] App starts without errors
- [ ] Database connection successful
- [ ] Device reachable and responsive
- [ ] Manual sync completes successfully
- [ ] Dashboard shows attendance data
- [ ] Logs are being written
- [ ] Health check endpoint responds
- [ ] Backup runs daily
- [ ] Performance acceptable (< 1s response time)
- [ ] No memory leaks (check uptime)

---

## 14. Support & Escalation

### On-Call Runbook

**Issue: App won't start**
1. Check logs: `tail -f logs/error.log`
2. Verify database: `mysql -u srv100_attendance -p srv100_attendance -e "SELECT 1"`
3. Restart service: `sudo systemctl restart srv100-attendance`
4. Escalate if persists

**Issue: Device unreachable**
1. Ping device: `ping 192.168.0.10`
2. Check network/firewall
3. Restart device if needed
4. Run diagnostic test

**Issue: Sync failing**
1. Check device connection
2. Check database space: `df -h`
3. Review sync logs
4. Clear stuck processes: `pkill -f FKOldLogPuller`
5. Retry sync manually

---

## Summary

**Deployment Timeline:**
- Setup infrastructure: 1-2 hours
- Configure environment: 30 minutes
- Initialize database: 15 minutes
- Deploy application: 30 minutes
- Run tests: 15 minutes
- **Total: ~3 hours**

**Go-Live Checklist:** See Section 1

**Production Readiness:** ✅ READY
