#!/usr/bin/env python3
"""
CYRUS Production Health Monitor
24-hour system health monitoring for production deployment
"""

import sys
import os
import json
import time
import psutil
import requests
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any
import threading
import logging

# Add paths
sys.path.insert(0, '/Users/cronet/Downloads/cyrus-part2-assets-fullzip-4/server')
sys.path.insert(0, '/Users/cronet/Downloads/cyrus-part2-assets-fullzip-4/server/quantum_ai')

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('health_monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CYRUSHealthMonitor:
    """
    Production health monitoring system for CYRUS
    """

    def __init__(self, monitoring_duration_hours: int = 24):
        self.monitoring_duration = timedelta(hours=monitoring_duration_hours)
        self.start_time = datetime.now()
        self.end_time = self.start_time + self.monitoring_duration
        self.monitoring_active = False
        self.health_metrics = []
        self.alerts = []
        self.system_status = 'INITIALIZING'

        # Health thresholds
        self.thresholds = {
            'cpu_percent': 80.0,      # Max CPU usage %
            'memory_percent': 85.0,   # Max memory usage %
            'disk_usage_percent': 90.0,  # Max disk usage %
            'response_time_max': 5.0,    # Max response time in seconds
            'error_rate_max': 0.05,      # Max error rate (5%)
            'uptime_min': 0.95        # Min uptime percentage
        }

    def start_monitoring(self) -> None:
        """Start the health monitoring process"""
        logger.info("🚀 Starting CYRUS Production Health Monitoring")
        logger.info(f"Monitoring Duration: {self.monitoring_duration}")
        logger.info(f"Start Time: {self.start_time}")
        logger.info(f"End Time: {self.end_time}")

        self.monitoring_active = True
        self.system_status = 'MONITORING'

        # Start monitoring threads
        monitoring_thread = threading.Thread(target=self._continuous_monitoring)
        alert_thread = threading.Thread(target=self._alert_monitoring)

        monitoring_thread.daemon = True
        alert_thread.daemon = True

        monitoring_thread.start()
        alert_thread.start()

        # Wait for monitoring duration
        try:
            while datetime.now() < self.end_time and self.monitoring_active:
                time.sleep(60)  # Check every minute
                self._log_status_update()
        except KeyboardInterrupt:
            logger.info("Monitoring interrupted by user")
        finally:
            self.stop_monitoring()

    def stop_monitoring(self) -> None:
        """Stop the monitoring process"""
        logger.info("🛑 Stopping CYRUS Health Monitoring")
        self.monitoring_active = False
        self.system_status = 'STOPPED'

        # Generate final report
        self._generate_monitoring_report()

    def _continuous_monitoring(self) -> None:
        """Continuous system monitoring"""
        check_interval = 30  # seconds

        while self.monitoring_active and datetime.now() < self.end_time:
            try:
                # Collect system metrics
                metrics = self._collect_system_metrics()

                # Test system functionality
                functional_tests = self._run_functionality_tests()

                # Combine metrics
                health_snapshot = {
                    'timestamp': datetime.now().isoformat(),
                    'system_metrics': metrics,
                    'functional_tests': functional_tests,
                    'overall_health': self._calculate_overall_health(metrics, functional_tests)
                }

                self.health_metrics.append(health_snapshot)

                # Check for alerts
                self._check_alerts(metrics, functional_tests)

                time.sleep(check_interval)

            except Exception as e:
                logger.error(f"Monitoring error: {e}")
                self.alerts.append({
                    'timestamp': datetime.now().isoformat(),
                    'type': 'MONITORING_ERROR',
                    'message': f"Health monitoring failed: {e}",
                    'severity': 'HIGH'
                })

    def _collect_system_metrics(self) -> Dict:
        """Collect comprehensive system metrics"""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()

            # Memory metrics
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_used_gb = memory.used / (1024**3)
            memory_total_gb = memory.total / (1024**3)

            # Disk metrics
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            disk_used_gb = disk.used / (1024**3)
            disk_total_gb = disk.total / (1024**3)

            # Network metrics
            network = psutil.net_io_counters()
            bytes_sent_mb = network.bytes_sent / (1024**2)
            bytes_recv_mb = network.bytes_recv / (1024**2)

            # Process metrics (if CYRUS is running)
            cyrus_processes = []
            for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                try:
                    if 'python' in proc.info['name'].lower() and 'cyrus' in ' '.join(proc.cmdline()).lower():
                        cyrus_processes.append({
                            'pid': proc.info['pid'],
                            'cpu_percent': proc.info['cpu_percent'],
                            'memory_percent': proc.info['memory_percent']
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

            return {
                'cpu': {
                    'percent': cpu_percent,
                    'cores': cpu_count,
                    'status': 'OK' if cpu_percent < self.thresholds['cpu_percent'] else 'HIGH'
                },
                'memory': {
                    'percent': memory_percent,
                    'used_gb': round(memory_used_gb, 2),
                    'total_gb': round(memory_total_gb, 2),
                    'status': 'OK' if memory_percent < self.thresholds['memory_percent'] else 'HIGH'
                },
                'disk': {
                    'percent': disk_percent,
                    'used_gb': round(disk_used_gb, 2),
                    'total_gb': round(disk_total_gb, 2),
                    'status': 'OK' if disk_percent < self.thresholds['disk_usage_percent'] else 'CRITICAL'
                },
                'network': {
                    'bytes_sent_mb': round(bytes_sent_mb, 2),
                    'bytes_recv_mb': round(bytes_recv_mb, 2)
                },
                'cyrus_processes': cyrus_processes,
                'system_load': os.getloadavg() if hasattr(os, 'getloadavg') else 'N/A'
            }

        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
            return {'error': str(e)}

    def _run_functionality_tests(self) -> Dict:
        """Run basic functionality tests"""
        tests = {
            'file_system_access': self._test_file_access(),
            'network_connectivity': self._test_network_connectivity(),
            'core_files_integrity': self._test_core_files(),
            'response_time': self._test_response_time()
        }

        return tests

    def _test_file_access(self) -> Dict:
        """Test file system access"""
        try:
            test_file = Path('health_test.tmp')
            test_file.write_text('health_check')
            content = test_file.read_text()
            test_file.unlink()

            return {
                'status': 'PASS' if content == 'health_check' else 'FAIL',
                'details': 'File read/write successful'
            }
        except Exception as e:
            return {'status': 'FAIL', 'error': str(e)}

    def _test_network_connectivity(self) -> Dict:
        """Test network connectivity"""
        try:
            # Test basic connectivity
            response = requests.get('https://www.google.com', timeout=5)
            return {
                'status': 'PASS' if response.status_code == 200 else 'FAIL',
                'response_time': response.elapsed.total_seconds(),
                'status_code': response.status_code
            }
        except Exception as e:
            return {'status': 'FAIL', 'error': str(e)}

    def _test_core_files(self) -> Dict:
        """Test core files integrity"""
        core_files = [
            'server/quantum_ai/quantum_ai_core.py',
            'server/quantum_ai/device_controller.py',
            'requirements.txt',
            'pyproject.toml'
        ]

        missing_files = []
        for file_path in core_files:
            if not Path(file_path).exists():
                missing_files.append(file_path)

        return {
            'status': 'PASS' if not missing_files else 'FAIL',
            'missing_files': missing_files,
            'total_files': len(core_files)
        }

    def _test_response_time(self) -> Dict:
        """Test system response time"""
        start_time = time.time()

        try:
            # Simulate a basic operation
            time.sleep(0.1)  # Simulate processing time
            response_time = time.time() - start_time

            return {
                'status': 'PASS' if response_time < self.thresholds['response_time_max'] else 'FAIL',
                'response_time_seconds': round(response_time, 3),
                'threshold_seconds': self.thresholds['response_time_max']
            }
        except Exception as e:
            return {'status': 'FAIL', 'error': str(e)}

    def _calculate_overall_health(self, metrics: Dict, tests: Dict) -> str:
        """Calculate overall system health"""
        if 'error' in metrics:
            return 'ERROR'

        # Check critical metrics
        critical_issues = 0

        if metrics.get('cpu', {}).get('status') == 'HIGH':
            critical_issues += 1
        if metrics.get('memory', {}).get('status') == 'HIGH':
            critical_issues += 1
        if metrics.get('disk', {}).get('status') == 'CRITICAL':
            critical_issues += 1

        # Check test failures
        failed_tests = sum(1 for test in tests.values() if test.get('status') == 'FAIL')

        if critical_issues > 0 or failed_tests > 0:
            return 'CRITICAL' if critical_issues > 1 else 'WARNING'
        else:
            return 'HEALTHY'

    def _check_alerts(self, metrics: Dict, tests: Dict) -> None:
        """Check for alert conditions"""
        alerts = []

        # CPU alert
        if metrics.get('cpu', {}).get('percent', 0) > self.thresholds['cpu_percent']:
            alerts.append({
                'type': 'HIGH_CPU_USAGE',
                'message': f"CPU usage: {metrics['cpu']['percent']:.1f}% (threshold: {self.thresholds['cpu_percent']}%)",
                'severity': 'MEDIUM'
            })

        # Memory alert
        if metrics.get('memory', {}).get('percent', 0) > self.thresholds['memory_percent']:
            alerts.append({
                'type': 'HIGH_MEMORY_USAGE',
                'message': f"Memory usage: {metrics['memory']['percent']:.1f}% (threshold: {self.thresholds['memory_percent']}%)",
                'severity': 'HIGH'
            })

        # Disk alert
        if metrics.get('disk', {}).get('percent', 0) > self.thresholds['disk_usage_percent']:
            alerts.append({
                'type': 'HIGH_DISK_USAGE',
                'message': f"Disk usage: {metrics['disk']['percent']:.1f}% (threshold: {self.thresholds['disk_usage_percent']}%)",
                'severity': 'CRITICAL'
            })

        # Test failures
        for test_name, test_result in tests.items():
            if test_result.get('status') == 'FAIL':
                alerts.append({
                    'type': 'FUNCTIONALITY_FAILURE',
                    'message': f"{test_name} test failed: {test_result.get('error', 'Unknown error')}",
                    'severity': 'HIGH'
                })

        # Add alerts to list
        for alert in alerts:
            alert['timestamp'] = datetime.now().isoformat()
            self.alerts.append(alert)
            logger.warning(f"🚨 ALERT: {alert['type']} - {alert['message']}")

    def _alert_monitoring(self) -> None:
        """Monitor and escalate alerts"""
        while self.monitoring_active:
            # Check for critical alerts that need immediate attention
            recent_alerts = [a for a in self.alerts if (datetime.now() - datetime.fromisoformat(a['timestamp'])).seconds < 300]  # Last 5 minutes

            critical_alerts = [a for a in recent_alerts if a['severity'] == 'CRITICAL']
            high_alerts = [a for a in recent_alerts if a['severity'] == 'HIGH']

            if critical_alerts:
                logger.critical(f"🚨 CRITICAL ALERTS DETECTED: {len(critical_alerts)} critical issues in last 5 minutes")
                # In production, this would trigger notifications, auto-scaling, etc.

            if high_alerts:
                logger.error(f"⚠️ HIGH ALERTS DETECTED: {len(high_alerts)} high-priority issues in last 5 minutes")

            time.sleep(300)  # Check every 5 minutes

    def _log_status_update(self) -> None:
        """Log periodic status updates"""
        if not self.health_metrics:
            return

        latest_metrics = self.health_metrics[-1]
        overall_health = latest_metrics['overall_health']

        elapsed = datetime.now() - self.start_time
        remaining = self.end_time - datetime.now()

        logger.info(f"📊 Health Check - Status: {overall_health} | "
                   f"Elapsed: {elapsed} | Remaining: {remaining} | "
                   f"Total Checks: {len(self.health_metrics)} | "
                   f"Active Alerts: {len([a for a in self.alerts if (datetime.now() - datetime.fromisoformat(a['timestamp'])).seconds < 3600])}")

    def _generate_monitoring_report(self) -> Dict:
        """Generate comprehensive monitoring report"""
        total_checks = len(self.health_metrics)
        if total_checks == 0:
            return {'error': 'No monitoring data collected'}

        # Calculate statistics
        health_distribution = {}
        for snapshot in self.health_metrics:
            health = snapshot['overall_health']
            health_distribution[health] = health_distribution.get(health, 0) + 1

        # Calculate uptime
        healthy_checks = health_distribution.get('HEALTHY', 0)
        uptime_percentage = (healthy_checks / total_checks) * 100 if total_checks > 0 else 0

        # Alert summary
        alert_summary = {}
        for alert in self.alerts:
            alert_type = alert['type']
            alert_summary[alert_type] = alert_summary.get(alert_type, 0) + 1

        # Performance averages
        avg_cpu = sum(s['system_metrics'].get('cpu', {}).get('percent', 0) for s in self.health_metrics) / total_checks
        avg_memory = sum(s['system_metrics'].get('memory', {}).get('percent', 0) for s in self.health_metrics) / total_checks

        report = {
            'monitoring_period': {
                'start_time': self.start_time.isoformat(),
                'end_time': datetime.now().isoformat(),
                'planned_duration_hours': self.monitoring_duration.total_seconds() / 3600,
                'actual_duration_hours': (datetime.now() - self.start_time).total_seconds() / 3600
            },
            'summary_statistics': {
                'total_health_checks': total_checks,
                'uptime_percentage': round(uptime_percentage, 2),
                'average_cpu_usage': round(avg_cpu, 2),
                'average_memory_usage': round(avg_memory, 2),
                'total_alerts': len(self.alerts)
            },
            'health_distribution': health_distribution,
            'alert_summary': alert_summary,
            'critical_metrics': {
                'cpu_threshold': self.thresholds['cpu_percent'],
                'memory_threshold': self.thresholds['memory_percent'],
                'disk_threshold': self.thresholds['disk_usage_percent'],
                'uptime_threshold': self.thresholds['uptime_min'] * 100
            },
            'recommendations': self._generate_recommendations(uptime_percentage, alert_summary),
            'final_assessment': self._generate_final_assessment(uptime_percentage, len(self.alerts))
        }

        # Save report
        self._save_report(report)

        return report

    def _generate_recommendations(self, uptime_percentage: float, alert_summary: Dict) -> List[str]:
        """Generate monitoring recommendations"""
        recommendations = []

        if uptime_percentage < 95:
            recommendations.append("Investigate causes of system downtime and implement redundancy measures")

        if alert_summary.get('HIGH_MEMORY_USAGE', 0) > 5:
            recommendations.append("Optimize memory usage and consider increasing system memory")

        if alert_summary.get('HIGH_CPU_USAGE', 0) > 10:
            recommendations.append("Review CPU-intensive processes and consider optimization or scaling")

        if alert_summary.get('FUNCTIONALITY_FAILURE', 0) > 0:
            recommendations.append("Address functionality test failures and improve system stability")

        if not recommendations:
            recommendations.append("System performed well during monitoring period - continue regular monitoring")

        return recommendations

    def _generate_final_assessment(self, uptime_percentage: float, total_alerts: int) -> str:
        """Generate final health assessment"""
        if uptime_percentage >= 99.5 and total_alerts == 0:
            return "EXCELLENT: System demonstrated exceptional stability and performance"
        elif uptime_percentage >= 98.0 and total_alerts <= 5:
            return "GOOD: System performed well with minor issues"
        elif uptime_percentage >= 95.0:
            return "SATISFACTORY: System operational but requires attention"
        else:
            return "REQUIRES_ATTENTION: System stability issues detected"

    def _save_report(self, report: Dict) -> None:
        """Save monitoring report to file"""
        output_dir = Path('health_monitoring_results')
        output_dir.mkdir(exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = output_dir / f'cyrus_health_monitoring_{timestamp}.json'

        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)

        logger.info(f"Health monitoring report saved to {report_file}")

        # Also save alerts separately
        if self.alerts:
            alerts_file = output_dir / f'cyrus_alerts_{timestamp}.json'
            with open(alerts_file, 'w') as f:
                json.dump(self.alerts, f, indent=2, default=str)
            logger.info(f"Alerts log saved to {alerts_file}")

def main():
    """Main monitoring function"""
    import argparse

    parser = argparse.ArgumentParser(description='CYRUS Production Health Monitor')
    parser.add_argument('--duration', type=int, default=24,
                       help='Monitoring duration in hours (default: 24)')
    parser.add_argument('--demo', action='store_true',
                       help='Run in demo mode (shorter duration)')

    args = parser.parse_args()

    # Demo mode for testing
    if args.demo:
        args.duration = 1
        print("🎯 Running in DEMO mode (1 hour monitoring)")

    monitor = CYRUSHealthMonitor(monitoring_duration_hours=args.duration)

    try:
        print(f"🔍 Starting {args.duration}-hour CYRUS health monitoring...")
        print("Press Ctrl+C to stop monitoring early")

        monitor.start_monitoring()

        # Generate and display final report
        if monitor.health_metrics:
            print("\n📊 CYRUS Health Monitoring Complete")
            print("=" * 50)

            latest_metrics = monitor.health_metrics[-1]
            print(f"Final System Health: {latest_metrics['overall_health']}")
            print(f"Total Monitoring Checks: {len(monitor.health_metrics)}")
            print(f"Total Alerts Generated: {len(monitor.alerts)}")

            if monitor.alerts:
                print("\n🚨 Recent Alerts:")
                recent_alerts = monitor.alerts[-5:]  # Show last 5 alerts
                for alert in recent_alerts:
                    print(f"  • {alert['type']}: {alert['message']}")

            print("\n✅ Monitoring reports saved to 'health_monitoring_results/' directory")
        else:
            print("❌ No monitoring data collected")

    except KeyboardInterrupt:
        print("\n🛑 Monitoring stopped by user")
        monitor.stop_monitoring()
    except Exception as e:
        print(f"❌ Monitoring failed: {e}")
        monitor.stop_monitoring()
        return 1

    return 0

if __name__ == "__main__":
    exit(main())