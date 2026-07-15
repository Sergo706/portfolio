---
title: Useful Bash Aliases
description: A collection of useful Bash aliases to boost terminal productivity.
date: 2026-07-15
image: /knowledge-base/bash.png
readingTime: 5
contentType: cheatsheet
category: terminal
tags:
 - Bash
 - Linux
 - Terminal
 - Productivity
---

Bash aliases are shortcuts that map long or complex commands to shorter, memorable keywords. They save time, reduce typing errors, and significantly boost terminal productivity.

This is some of the aliases i use, categorized by their purpose. Add these to your `~/.bashrc` or `~/.bash_aliases` file.

### Core File Listing and Color Support

List files in long format with file type indicators:
```bash [Terminal]
alias ll='ls -alF'
```

List all files including hidden ones:
```bash [Terminal]
alias la='ls -A'
```

List files in columns:
```bash [Terminal]
alias l='ls -CF'
```

Enable automatic terminal color support for `ls` and `grep` commands:
```bash [Terminal]
if [ -x /usr/bin/dircolors ]; then
    test -r ~/.dircolors && eval "$(dircolors -b ~/.dircolors)" || eval "$(dircolors -b)"
    
    alias ls='ls --color=auto'
    alias grep='grep --color=auto'
    alias fgrep='fgrep --color=auto'
    alias egrep='egrep --color=auto'
fi
```

### Git and Code Analysis

Stage and commit all modified files with a custom message:
```bash [Terminal]
gac() {
  git commit -a -m "$1"
}
```

Count total lines of tracked code in the current Git repository:
```bash [Terminal]
alias loc='git ls-files -z | xargs -0 cat | wc -l'
```

Count lines of code while ignoring lockfiles:
```bash [Terminal]
alias loc_el="git ls-files | grep -vE 'package-lock\.json|yarn\.lock' | xargs -d '\n' cat | wc -l"
```

Count pure code lines, filtering out lockfiles, markdown, comments, and empty lines:
```bash [Terminal]
alias eloc="git ls-files | grep -vE 'package-lock\.json|yarn\.lock|\.md$' | xargs -d '\n' cat | sed '/^\s*\/\//d; /^\s*\/\*/,/\*\//d; /^\s*$/d' | wc -l"
```

Display the exact timestamps of the first and last commits in the repository:
```bash [Terminal]
alias ptimes='git log --reverse --format="%cd" | head -n 1 && git log -1 --format="%cd"'
```

### Networking and Ports

List all active system processes listening on TCP ports:
```bash [Terminal]
alias ls_tcp="sudo lsof -nP -iTCP -sTCP:LISTEN"
```

List all active system processes listening on UDP ports:
```bash [Terminal]
alias ls_udp="sudo lsof -nP -iUDP"
```

Display all open listening network ports and routing sockets:
```bash [Terminal]
alias lsp="sudo ss -tulpn"
```

Find the exact process occupying a specific network port (Usage: `listPort <port> [TCP|UDP]`):
```bash [Terminal]
listPort() {
  local port=$1
  local proto=${2:-TCP}

  if [ -n "$port" ]; then
    proto=$(echo "$proto" | tr '[:lower:]' '[:upper:]')

    if [ "$proto" = "UDP" ]; then
      sudo lsof -nP -iUDP:"$port"
    else
      sudo lsof -nP -iTCP:"$port" -sTCP:LISTEN
    fi
  else
    echo "Usage: listPort <port_number> [TCP|UDP]"
  fi
}
```

### Miscellaneous Utilities

Stream an active log file starting exactly from the current moment:
```bash [Terminal]
followlog() {
  if [ -z "$1" ]; then
    echo "Error: No file path specified."
    echo "Usage: followlog /path/to/file"
    return 1
  fi
  tail -n 0 -f "$1"
}
```

Fetch raw URL data and format it cleanly as JSON:
```bash [Terminal]
jurl() {
  curl "$@" | jq .
}
```

Fetch and display a random dark or miscellaneous joke:
```bash [Terminal]
joke() {
    curl -s "https://v2.jokeapi.dev/joke/Miscellaneous,Dark?blacklistFlags=nsfw,racist,sexist,explicit" | \
    jq -r '.joke // (.setup + "\n" + .delivery)'
}
```

### Directory Navigation

Enable color output for directory listing:
```bash [Terminal]
alias ls='ls --color=auto'
```

Correct common typo for listing files:
```bash [Terminal]
alias sl='ls'
```

List all files in a compact view, appending indicators for file types:
```bash [Terminal]
alias la='ls -AF'
```

List all files in long format:
```bash [Terminal]
alias ll='ls -Al'
```

List all files (including hidden ones):
```bash [Terminal]
alias l='ls -A'
```

List files one per line:
```bash [Terminal]
alias l1='ls -1'
```

List files with type indicators (e.g., `/` for directories, `*` for executables):
```bash [Terminal]
alias lf='ls -F'
```

Go up one directory:
```bash [Terminal]
alias ..='cd ..'
```

Correct common typo for going up one directory:
```bash [Terminal]
alias cd..='cd ..'
```

Go up two directories:
```bash [Terminal]
alias ...='cd ../..'
```

Go up three directories:
```bash [Terminal]
alias ....='cd ../../..'
```

Go back to the previous directory:
```bash [Terminal]
alias -- -='cd -'
```

Create a directory and any necessary parent directories:
```bash [Terminal]
alias md='mkdir -p'
```

Remove an empty directory:
```bash [Terminal]
alias rd='rmdir'
```

### Editor Shortcuts

Open the default system editor (falls back to nano):
```bash [Terminal]
alias edit='${EDITOR:-${ALTERNATE_EDITOR:-nano}}'
```

Alias `e` to the default editor command:
```bash [Terminal]
alias e='edit'
```

Open the default visual editor with root privileges (falls back to vim):
```bash [Terminal]
alias svim='sudo ${VISUAL:-vim}'
```

Open nano with root privileges:
```bash [Terminal]
alias snano='sudo ${ALTERNATE_EDITOR:-nano}'
```

Open the default system editor with root privileges:
```bash [Terminal]
alias sedit='sudo ${EDITOR:-${ALTERNATE_EDITOR:-nano}}'
```

Quickly edit the `.bashrc` configuration file:
```bash [Terminal]
alias vbrc='${VISUAL:-vim} ~/.bashrc'
```

Quickly edit the `.bash_profile` configuration file:
```bash [Terminal]
alias vbpf='${VISUAL:-vim} ~/.bash_profile'
```

### General Utilities

Clear the terminal screen:
```bash [Terminal]
alias c='clear'
```

Quickly exit the terminal session:
```bash [Terminal]
alias q='exit'
```

Quickly navigate to the Downloads directory:
```bash [Terminal]
alias dow='cd $HOME/Downloads'
```

Show the terminal command history:
```bash [Terminal]
alias h='history'
```

Display a graphical directory tree:
```bash [Terminal]
alias tree="find . -print | sed -e 's;[^/]*/;|____;g;s;____|; |;g'"
```

Recursively force remove files and directories:
```bash [Terminal]
alias rmrf='rm -rf'
```

---

### Bash-it Commands

[Bash-it](https://github.com/Bash-it/bash-it) is a community Bash framework. Install it and check out it's plugins, and aliases it provide.

```bash
$ bash-it show plugins
$ bash-it show aliases
```

Some useful aliases to enable:

| Alias | Description |
| :--- | :--- |
| `bash-it` | Aliases for the bash-it command (automatically included with `general`) |
| `curl` | Curl aliases for convenience. |
| `directory` | Shortcuts for directory commands (`ls`, `cd`, etc). |
| `editor` | Shortcuts for editing. |
| `general` | General aliases. |
| `git` | Common git abbreviations. |
| `node` | The Node.js environment aliases. |
| `npm` | Common npm abbreviations. |

Some useful plugins to enable:

| Plugin | Description |
| :--- | :--- |
| `base` | Miscellaneous tools |
| `cht-sh` | Simplify `curl cht.sh/<query>` to `cht.sh <query>` |
| `colors` | Provides color definitions and ANSI functions for terminal output |
| `docker-compose` | Helper functions for using docker-compose |
| `docker` | Helpers to more easily work with Docker |
| `explain` | mankier.com explain function to explain other commands |
| `git` | Git helper functions |
| `history` | Improve history handling with sane defaults |
| `man` | Colorize man pages for better readability |
| `ssh` | SSH helper functions |
