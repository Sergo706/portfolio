---
title: Jq logs Cheat sheet
description: Parsing and filtering JSON logs from the command line
date: 2026-07-15
image: /knowledge-base/jq.jpg
readingTime: 5
contentType: recipe
category: tools
tags:
 - jq
 - JSON
 - CLI
 - Logging
---

File-based logs (NDJSON + jq)
-----------------------------

Assume your log files live under `logs/`:

| File | Contains levels ≥ ... |
| --- | --- |
| `info.log` | `info`, `warn`, `error`, `fatal` |
| `warn.log` | `warn`, `error`, `fatal` |
| `errors.log` | `error`, `fatal` |
| `http.log` | HTTP middleware entries |

### 1\. Follow & pretty-print all entries

```bash
tail -f logs/info.log | jq .
```
### 2\. Only errors

```bash
tail -f logs/info.log\
  | jq 'select(.level=="error")'
```
### 3\. Only pure "info" (level 30)

```bash
tail -f logs/info.log\
  | jq 'select(.level==30)'
```
### 4\. Filter by your service or key

```bash
tail -f logs/info.log\
  | jq 'select(.service=="BOT DETECTOR")'
```
Or BFF util:

```bash
tail -f logs/info.log\
  | jq 'select(.Utils=="BFF TO API")'
```
### 5\. Extract timestamp + message

```bash
tail -f logs/info.log\
  | jq -r '.time + " " + .msg'
```
### 6\. Show only slow HTTP requests (>100 ms)

```bash
tail -f logs/http.log\
  | jq 'select(.latency > 100)'
```
### 7\. Live count per level

```bash
tail -f logs/info.log\
  | jq -nR 'while (input?; .) | fromjson? | .level'\
  | sort | uniq -c
```

### 8\. Grep first for speed, then jq

```bash
grep --line-buffered '"userService"' logs/app.log\
  | jq .
```
* * * * *

🐳 systemd journal (JSON + journalctl)
--------------------------------------

If you've got your service running under systemd and you want the same JSON-style queries:

1.  **Follow live with JSON output**


```bash
    journalctl -u myapp.service -f -o json
```

2.  **Pipe to jq**

```bash
    journalctl -u myapp.service -f -o json\
      | jq 'select(.MESSAGE | test("error"; "i"))'
```

3.  **Filter by priority** (`0`=emerg → `7`=debug)

```bash
    journalctl -u myapp.service -f -p err
```

4.  **Since a time**

```bash
    journalctl -u myapp.service --since "1 hour ago" -o json | jq .
```

5.  **Combine filtering**

```bash
    journalctl -u myapp.service -f -o json\
      | jq 'select(.PRIORITY>=4 and .MESSAGE | test("refund"))'
```

* * * * *

### Tips

-   **`jq -c ...`** emits compact JSON (one line), faster to tail.

-   **`--line-buffered`** on grep forces immediate output in pipes.

-   For systemd, `-o json-pretty` gives human-readable multiline JSON.

Keep this snippet handy in your terminal, and you'll have full live observability of both your file-based Pino logs and anything running under systemd.