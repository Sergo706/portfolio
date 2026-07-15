---
title: systemd Service Guide
description: This guide is a step-by-step reference on managing a `myapp.service` unit file.
date: 2026-07-15
image: /knowledge-base/social-platforms.png
readingTime: 10
contentType: guide
category: devops
tags:
 - Linux
 - Systemd
---


## Service Unit File (`/etc/systemd/system/myapp.service`)

```ini
[Unit]
Description=My App Service
After=network.target

[Service]
User=myappuser
Group=myappuser
WorkingDirectory=/var/www/myapp
ExecStart=/usr/bin/node app.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

> **Explanation of Unit Sections:**
>
> * **\[Unit]**: Metadata and dependencies.
> * **\[Service]**: How the service runs.
> * **\[Install]**: Installation details for `enable`.

---

## 1. Create and Edit the Service File

```bash
sudo nano /etc/systemd/system/myapp.service
```

* Opens the `myapp.service` file in the nano editor with root privileges.

---

## 2. Reload systemd Configuration

```bash
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
```

* **daemon-reexec**: Reexecute the systemd manager to pick up code changes.
* **daemon-reload**: Reload unit files to register new or changed services.

---

## 3. Enable the Service at Boot

```bash
sudo systemctl enable myapp.service
```

* Creates symlinks so that `myapp.service` starts automatically on system boot.

---

## 4. Start the Service

```bash
sudo systemctl start myapp.service
```

* Launches the `myapp.service` immediately.

---

## 5. Check Status and Logs

```bash
sudo systemctl status myapp.service
journalctl -u myapp.service -f
```

* **status**: Shows service state, PID, recent logs, and errors.
* **journalctl -u**: Follows logs (`-f`) for `myapp.service` in real time.

---

## 6. Useful \[Service] Directives

Below are configuration snippets you can add under the `[Service]` section to customize behavior. They are **not** shell commands but unit file directives.

### 6.1 Environment & Files

```ini
Environment=NODE_ENV=production PORT=8080         # Inline env vars
EnvironmentFile=-/etc/myapp.env                   # Load env from file, ignore if missing
WorkingDirectory=/var/www/myapp                   # Set working directory
PIDFile=/run/myapp.pid                            # Path for PID tracking
```

### 6.2 Resource Limits & Timeouts

```ini
TimeoutStartSec=30                 # Max seconds to start before timeout
TimeoutStopSec=10                  # Max seconds to stop before SIGKILL
RestartSec=5                       # Delay before restarting
MemoryMax=200M                     # cgroup memory cap
CPUQuota=20%                       # cgroup CPU cap
StartLimitIntervalSec=60           # Window for restart rate limiting
StartLimitBurst=3                  # Max restarts in interval
```

### 6.3 Logging & Output

```ini
StandardOutput=journal            # Send stdout to journal
StandardError=journal             # Send stderr to journal
SyslogIdentifier=myapp            # Tag logs in journal
# Or redirect to files:
StandardOutput=append:/var/log/myapp.log
StandardError=append:/var/log/myapp-error.log
```

### 6.4 Process Control & Hooks

```ini
ExecStartPre=/usr/bin/npm install         # Run before main start
ExecStartPre=/bin/sleep 10                # Delay service start by 10s
ExecStartPost=/bin/echo "App started"    # Run after service has started
ExecStop=/usr/bin/node cleanup.js         # Run on service stop
Type=simple         # Run in foreground (default)
# Alternative types:
# Type=exec         # Run then exit
# Type=forking      # Daemon forks to background
KillMode=control-group                   # Kill whole process group
KillMode=process                         # Or kill only main PID
KillSignal=SIGINT                        # Signal to use on stop
```

### 6.5 Restart Behavior

```ini
Restart=on-failure                       # Restart on non-zero exit
RestartSec=5                             # Wait before restart
StartLimitIntervalSec=60                 # Window for crash limit
StartLimitBurst=3                        # Max crashes in window
```

### 6.6 Security & Sandboxing

```ini
NoNewPrivileges=true                    # Disable privilege escalation
PrivateTmp=true                          # Isolate /tmp and /var/tmp
PrivateDevices=true                      # Block access to device nodes
ProtectSystem=full                       # Mount /usr, /boot, etc as read-only
ProtectHome=true                         # Block access to home directories
ProtectKernelModules=true                # Restrict kernel module loading
ProtectControlGroups=true                # Restrict cgroup access
ProtectClock=true                        # Prevent time changes
ReadOnlyPaths=/var/www/myapp             # Mount path read-only
ReadWritePaths=/var/www/myapp/uploads    # Allow writes only here
InaccessiblePaths=/etc/ssh               # Block access to sensitive paths
CapabilityBoundingSet=CAP_NET_BIND_SERVICE   # Limit capabilities
AmbientCapabilities=CAP_NET_BIND_SERVICE    # Grant capability to exec
```

### 6.7 Startup/Shutdown Behavior

```ini
After=network-online.target               # Start after network is up
Requires=network-online.target            # Require this target
ConditionPathExists=/var/www/myapp/app.js # Only start if file exists
```

### 6.8 Diagnostics & Debugging

```ini
# Run in debug mode
ExecStart=/usr/bin/node --inspect app.js
# Enable verbose debug logs
Environment=DEBUG=myapp:*
```

## 7. Deploying Updates and Recommendations

1. After any change to unit or env files:

   ```bash
   sudo systemctl daemon-reload
   ```
2. Restart the service:

   ```bash
   sudo systemctl restart myapp.service
   ```
3. Check status and logs:

   ```bash
   sudo systemctl status myapp.service
   journalctl -u myapp.service -f
   ```

## 8. Boot-Time Analysis

```bash
systemd-analyze blame               # Time taken by each service
systemd-analyze critical-chain      # Startup order and delays
systemd-analyze plot > boot.svg     # Visualize boot sequence
```

---

*Use this complete reference to cover every directive and command discussed, ensuring a robust, secure systemd service for your Node.js application.*

## 9. Deploying at Boot

```bash
sudo systemctl enable myapp.service  # Start on boot
sudo systemctl disable myapp.service # Disable autostart
```

### Deploying Updates and Recommendations

1. After any change to the unit file or environment files, run:
```bash
sudo systemctl daemon-reload
```

2. Restart the service:

   ```bash
   sudo systemctl restart myapp.service
   ```
3. Verify status and logs as shown above.

# Targets, Timers, and Exec Details


## 1) Targets — What They Are and How To Use Them

### 1.1 What is a target?

* A **target** (`*.target`) is a **labeled checkpoint/group** used for ordering and grouping. It **does not run code**.
* Targets only support the **generic** sections: `[Unit]` and `[Install]`. There is **no** `[Target]` section.
* You use targets to:

  * Group services so they can start/stop together.
  * Set **ordering** (`After=`/`Before=`) relative to a checkpoint.

### 1.2 Options you actually use in a `.target`

(All are generic `[Unit]` options.)

* **Dependencies (pull‑in):**

  * `Wants=unit1 unit2` — start these too (weak dep).
  * `Requires=unit1` — hard dep; if it fails/stops, this target fails/stops.
  * `BindsTo=unit1` — like `Requires=`, but also stops if `unit1` disappears (e.g., a device).
  * `PartOf=unit1` — link lifecycles; stopping `unit1` also stops this.
  * `Conflicts=unit1` — cannot be active together.
* **Ordering (no pull‑in):** `After=unit1` / `Before=unit1`.
* **Switching:** `AllowIsolate=yes` — allows `systemctl isolate my.target` (switch the system to only that group).

**\[Install] section (wiring at enable time):**

* `WantedBy=multi-user.target` — enabling your target creates a symlink so it’s part of normal boots.
* `RequiredBy=…`, `Alias=…` — less common; same idea.

### 1.3 Common targets you’ll meet

* `multi-user.target` — standard server boot (no GUI). Most daemons attach here.
* `graphical.target` — multi-user + display manager.
* `network.target` — networking stack is initialized (**may not** have an IP yet).
* `network-online.target` — a checkpoint that **waits until the network is up** (only effective if a system-specific *wait-online* unit is present; see 1.5).
* `sockets.target`, `timers.target`, `paths.target` — milestones socket/timer/path units hook into.
* `shutdown.target`, `basic.target`, `rescue.target` — other system milestones.

### 1.4 Example: group services behind a custom target

```ini
# /etc/systemd/system/my-stack.target
[Unit]
Description=My app stack (API + worker)
Wants=myapi.service myworker.service
After=network-online.target
AllowIsolate=yes

[Install]
WantedBy=multi-user.target
```

Usage:

```bash
systemctl daemon-reload
systemctl enable --now my-stack.target
systemctl start my-stack.target         # starts the group
systemctl list-dependencies my-stack.target
```

### 1.5 "After=network-online.target" (ordering) vs pulling it in

* `After=network-online.target` ⇒ start **after** that checkpoint (ordering only).
* If you also want it **included** in the boot transaction, add:

  ```ini
  Wants=network-online.target
  After=network-online.target
  ```
* Ensure your network stack provides the wait helper:

  ```bash
  # for systemd-networkd setups
  systemctl status systemd-networkd-wait-online.service

  # for NetworkManager setups
  systemctl status NetworkManager-wait-online.service
  ```
* Remember: *online* is a **boot-time checkpoint**, not a live network monitor.

---

## 2) Timers — Cron Replacement (Clear Mechanics)

### 2.1 How a timer triggers a service

* Naming rule: `X.timer` triggers `X.service` **by default** (basename match).
* To trigger a differently named unit, set `Unit=that.service` in the timer’s `[Timer]` section.
* **Enable the timer**, not the service, to put it on schedule.

### 2.2 Timer sections and key options

Timer units have a `[Timer]` section with two families of triggers:

**A) Monotonic (relative) triggers** — based on elapsed time

* `OnBootSec=5min` — 5 minutes **after boot**.
* `OnStartupSec=30s` — 30s after the service manager starts (subtle difference from boot).
* `OnActiveSec=1h` — 1 hour after the **timer** became active.
* `OnUnitActiveSec=15min` — 15 minutes after the **triggered unit** last ran.
* `OnUnitInactiveSec=10min` — 10 minutes after the unit last went inactive.

**B) Calendar (wall‑clock) triggers** — real dates/times

* `OnCalendar=daily` — every day at 00:00.
* `OnCalendar=02:00` — every day at 02:00.
* `OnCalendar=Mon..Fri 02:00` — weekdays at 02:00.
* `OnCalendar=*-*-01 00:00` — first day of every month at midnight.
* `OnCalendar=2025-08-12 14:30:00` — specific date/time.

**Behavior modifiers**

* `Persistent=true` — if a run was missed (machine was off), run once on the next boot.
* `RandomizedDelaySec=5m` — add a random delay to spread load.
* `AccuracySec=1m` — coalesce timers for efficiency; use smaller if you need precision.
* `WakeSystem=yes` — attempt to wake from suspend for the job (hardware/permissions permitting).
* `Unit=foo.service` — (optional) explicit unit name to trigger.

**\[Install] for timers**

* `WantedBy=timers.target` — enabling the timer hooks it into the system’s timer milestone.

### 2.3 Minimal working pairs (copy/paste)

**Nightly backup at 02:00, catch up if missed**

```ini
# /etc/systemd/system/backup.service
[Unit]
Description=Nightly backup job

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
```

```ini
# /etc/systemd/system/backup.timer
[Unit]
Description=Run backup every night at 02:00

[Timer]
OnCalendar=02:00
Persistent=true
RandomizedDelaySec=5m
AccuracySec=1m

[Install]
WantedBy=timers.target
```

Commands:

```bash
systemctl daemon-reload
systemctl enable --now backup.timer
systemctl list-timers --all
journalctl -u backup.service -e
```

**Every 15 minutes since last run finished**

```ini
# /etc/systemd/system/clean-cache.service
[Unit]
Description=Clean app cache

[Service]
Type=oneshot
ExecStart=/usr/local/bin/clean_cache.sh
```

```ini
# /etc/systemd/system/clean-cache.timer
[Unit]
Description=Clean cache every 15 minutes (interval since last run)

[Timer]
OnUnitActiveSec=15min

[Install]
WantedBy=timers.target
```

**Hourly with jitter (avoid thundering herd)**

```ini
# /etc/systemd/system/report.timer
[Unit]
Description=Generate report hourly with jitter

[Timer]
OnCalendar=hourly
RandomizedDelaySec=10m
AccuracySec=1m

[Install]
WantedBy=timers.target
```

### 2.4 Useful timer diagnostics

```bash
systemctl list-timers --all                 # see next/last runs
systemctl status myjob.timer                # status of the schedule
systemctl status myjob.service              # status of the job itself
journalctl -u myjob.service -e              # logs from the job
systemd-analyze calendar 'Mon..Fri 02:00'   # parse/preview a calendar spec
systemd-run --on-active=5s /bin/echo test   # ad-hoc timer-run to test mechanics
```

---

## 3) Services — Exec, Types, Restart, and Sandboxing (Quick but Precise)

### 3.1 Exec lines (start/stop/reload hooks)

* **Absolute path required** for the first token in `ExecStart=` (e.g., `/usr/bin/node`, not `node`).
* If you need shell features (pipes, `&&`), wrap them: `ExecStart=/bin/bash -lc 'cmd1 && cmd2'`.
* Hooks: `ExecStartPre=…`, `ExecStart=…`, `ExecStartPost=…`, `ExecReload=…`, `ExecStop=…`, `ExecStopPost=…`.

**Exec prefixes** (put before the path on that line):

* `-`  → ignore non‑zero exit (best‑effort step).
* `+`  → run with full root privileges (bypass `User=`/caps **for this command only**).
* `!`  → elevate only user/group creds (ignore `User=`/`Group=`) but keep other sandboxes.
* `@`  → set custom `argv[0]` (rare).

### 3.2 `Type=` (how systemd decides the service is ready)

* `Type=simple` (default) — run `ExecStart` and consider it the main process.
* `Type=oneshot` — short tasks; can have multiple `ExecStart=` lines.
* `Type=forking` — legacy daemons that daemonize themselves; usually add `PIDFile=`.
* `Type=notify` — service calls `sd_notify(READY=1)` when ready.
* `Type=dbus` — becomes ready when it acquires a D‑Bus name.

### 3.3 Identity, environment, and restart

* `User=` / `Group=` — drop privileges.
* `WorkingDirectory=` — set CWD.
* `Environment=KEY=VAL …` and/or `EnvironmentFile=/etc/myapp.env`.
* Restart policy: `Restart=on-failure` (good default), `RestartSec=1s`. Others: `no|on-success|on-abnormal|on-abort|always`.
* I/O and timeouts: `StandardOutput=journal` (default), `StandardError=inherit|journal|null|file:/path`; `TimeoutStartSec=`, `TimeoutStopSec=`.
* Kill behavior: `KillMode=control-group` (default: kill cgroup), `SendSIGKILL=`.

### 3.4 Minimal hardening flags (dial back if needed)

Add cautiously; remove if your app needs broader access.

* `NoNewPrivileges=yes`
* `PrivateTmp=yes`
* `ProtectSystem=strict` (or `full`)
* `ProtectHome=read-only|yes`
* `ProtectKernelTunables=yes`, `ProtectKernelLogs=yes`, `ProtectControlGroups=yes`
* `RestrictAddressFamilies=AF_INET AF_INET6` (plus any others you need)
* `RestrictSUIDSGID=yes`, `LockPersonality=yes`
* `CapabilityBoundingSet=` (drop all or whitelist), `AmbientCapabilities=` (grant minimal caps)
* `SystemCallFilter=@system-service` (start here, narrow if you can)

---

## 4) Ordering vs Dependencies — One-Glance Cheat Sheet

* **Ordering only:** `After=X` / `Before=X` (does **not** pull X in).
* **Pull‑in:** `Wants=X` (weak) / `Requires=X` (strong; if X fails/stops, so do you).
* **Lifecycle linking:** `PartOf=X` (stop/restart together), `BindsTo=X` (like Requires + stop if X disappears).
* **Mutual exclusion:** `Conflicts=X`.

**Common pattern — service that needs network at start:**

```ini
[Unit]
Wants=network-online.target
After=network-online.target
```

…and ensure your system has a `*-wait-online.service` for your network stack.

---

## 5) Useful Commands & Diagnostics (Copy/Paste)

```bash
# See active units by type
systemctl list-units --type=service --state=running
systemctl list-units --type=target

# Inspect unit dependencies/ordering
systemctl list-dependencies my-stack.target
systemd-analyze critical-chain myapi.service

# Show the effective unit file (including drop-ins)
systemctl cat myapi.service

# Verify a unit file’s syntax
systemd-analyze verify /etc/systemd/system/myapi.service

# Enable/disable/start/stop/show state
systemctl enable --now foo.service
systemctl disable --now foo.service
systemctl is-enabled foo.service
systemctl is-active foo.service

# Logs
journalctl -u foo.service -b -e -f

# Timers overview and testing
systemctl list-timers --all
systemd-analyze calendar 'Mon..Fri 02:00'
systemd-run --on-active=10s /usr/bin/echo test

# Wait-online helpers (pick whichever your system uses)
systemctl status systemd-networkd-wait-online.service
systemctl status NetworkManager-wait-online.service
```

---

## 6) Handy Patterns (Tiny Recipes)

**Start service only when a path is mounted**

```ini
[Unit]
RequiresMountsFor=/mnt/data
After=network-online.target
Wants=network-online.target
```

**One-shot job + timer scaffold (reuse for migrations, syncs, etc.)**

```ini
# job.service
[Service]
Type=oneshot
ExecStart=/usr/local/bin/job.sh

# job.timer
[Timer]
OnCalendar=Sun 03:30
Persistent=true

[Install]
WantedBy=timers.target
```

**Group app daemons under a stack target**

```ini
# my-stack.target
[Unit]
Description=My stack
Wants=api.service worker.service
After=network-online.target

[Install]
WantedBy=multi-user.target
```


