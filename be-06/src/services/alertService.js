const fs = require('fs');
const path = require('path');

class AlertService {
  constructor() {
    this.alerts = [];
    this.alertLogPath = path.join(__dirname, '../../data/alerts.json');
    this.ensureDataDir();
    this.loadAlerts();
  }

  ensureDataDir() {
    const dir = path.dirname(this.alertLogPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  loadAlerts() {
    try {
      if (fs.existsSync(this.alertLogPath)) {
        const raw = fs.readFileSync(this.alertLogPath, 'utf8');
        this.alerts = JSON.parse(raw);
      }
    } catch (err) {
      console.error('[AlertService] Failed to load existing alerts:', err.message);
      this.alerts = [];
    }
  }

  saveAlerts() {
    try {
      fs.writeFileSync(this.alertLogPath, JSON.stringify(this.alerts, null, 2));
    } catch (err) {
      console.error('[AlertService] Failed to save alerts:', err.message);
    }
  }

  /**
   * Dispatch an alert for a job failure or system event
   */
  triggerAlert(type, message, metadata = {}) {
    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      type, // 'DLQ_JOB', 'MAX_RETRIES_EXCEEDED', 'JOB_FAILED', 'IDEMPOTENCY_CONFLICT'
      severity: type === 'DLQ_JOB' ? 'CRITICAL' : 'WARNING',
      message,
      metadata
    };

    this.alerts.unshift(alert); // newest first
    if (this.alerts.length > 200) {
      this.alerts = this.alerts.slice(0, 200); // keep recent 200
    }

    this.saveAlerts();

    // Log to console with high visibility formatting
    console.error(`\n🚨 [ALERT - ${alert.severity}] [${alert.type}]: ${alert.message}`);
    console.error(`   Job ID: ${metadata.jobId || 'N/A'}`);
    console.error(`   Payload/Error: ${JSON.stringify(metadata.error || metadata.details || '')}\n`);

    return alert;
  }

  getAlerts(limit = 50) {
    return this.alerts.slice(0, limit);
  }

  clearAlerts() {
    this.alerts = [];
    this.saveAlerts();
    return true;
  }
}

module.exports = new AlertService();
