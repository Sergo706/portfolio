---
title: SSH CookBook
description: Generating ssh key and logging into a server
date: 2026-07-15
image: /knowledge-base/bug-banner-main2.png
readingTime: 5
contentType: recipe
category: devops
tags:
 - SSH
 - Networking
 - Security
---

## GENERATING KEYS

To generate an RSA key pair on your local computer, type:

```bash
ssh-keygen
  ```

  OR

  ```bash
ssh-keygen -b 4096   # For longer key (4096 bits)
```

You will see:

> "Generating public/private rsa key pair.
> Enter file in which to save the key (/home/demo/.ssh/id\_rsa):"

This prompt allows you to choose the location to store your RSA private key. Press ENTER to leave this as the default, which will store them in the `.ssh` hidden directory in your user’s home directory.

Next, you'll be prompted to add a passphrase:

> "Enter passphrase (empty for no passphrase):"
> "Enter same passphrase again:"

> ⚠️  Setting a passphrase adds extra security. Without it, anyone with your private key can access your servers.

SSH key pair files generated:

```
~/.ssh/id_rsa       → Private key (DO NOT SHARE)
~/.ssh/id_rsa.pub   → Public key (can be shared)
```

### OVERWRITE WARNING

If a key already exists, you will see:

> "Overwrite (y/n)?"

> Choose 'y' only if you're sure. Overwriting removes access to all servers using the old key!

---

## TRANSFERRING PUBLIC KEY TO SERVER

Use `ssh-copy-id` to add your public key to the remote server:

```bash
ssh-copy-id -i ~/.ssh/id_rsa.pub remoteUser@ServerIP
```

OR

```bash
ssh-copy-id -i path/to/public/key remoteServerUser@ServerIP
```

This will add the public key to the remote server.

### A prompt THAT SHOULD APPEAR ONLY ONCE:

> "The authenticity of host '111.111.11.111 (111.111.11.111)' can't be established."
> "ECDSA key fingerprint is fd\:fd\:d4\:f9:77\:fe:73:84\:e1:55:00\:ad\:d6:6d:22\:fe."
> "Are you sure you want to continue connecting (yes/no)? yes"
> "/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed"
> "/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys"
> "demo\@111.111.11.111's password:"

After typing in the password, the contents of your `~/.ssh/id_rsa.pub` key will be appended to the end of the user account’s `~/.ssh/authorized_keys` file:

**Output:**

```
Number of key(s) added: 1
```

Now try logging into the machine, with:

```bash
ssh demo@111.111.11.111
```

and check to make sure that only the key(s) you wanted were added.

You can now log in to that account without a password:

```bash
ssh username@remote_host
```

---

## Permissions To be Set On the Local HOST

```bash
chmod 600 /path/to/PRIVATEKEY
chmod 644 /path/to/publickey
chmod 700 ~/.ssh
```

---

## Permissions To be Set on the Remote HOST

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

---

## Copying The Key manually

Copy the public key:

```bash
cat ~/.ssh/id_rsa.pub
```

On the remote server, create the `~/.ssh` directory if it does not already exist:

```bash
mkdir -p ~/.ssh
```

Go to:

```bash
nano ~/.ssh/authorized_keys
```

And paste the public key.

You should now be able to log in to the remote server without a password.

---

## First Time Connecting to a New Host

Your first time connecting to a new host, you will see a message that looks like this:

> "The authenticity of host '111.111.11.111 (111.111.11.111)' can't be established."
> "ECDSA key fingerprint is fd\:fd\:d4\:f9:77\:fe:73:84\:e1:55:00\:ad\:d6:6d:22\:fe."
> "Are you sure you want to continue connecting (yes/no)? yes"

Type `yes` to accept the authenticity of the remote host.

If you are using password authentication, you will be prompted for the password for the remote account here. If you are using SSH keys, you will be prompted for your private key’s passphrase if one is set, otherwise you will be logged in automatically.

---

## Useful commands

### Logging in to a Server with a Different Port

```bash
ssh -p port_num username@remote_host
```

### Viewing Logs

```bash
sudo tail -n 10 -f /var/log/auth.log
grep sshd /var/log/auth.log
```

### Adding your SSH Keys to an SSH Agent to Avoid Typing the Passphrase

```bash
eval "$(ssh-agent -s)"
```

OR

```bash
eval $(ssh-agent)
```

**Output:**

> "Agent pid 10891"

This will start the agent program and place it into the background. Now, you need to add your private key to the agent, so that it can manage your key:

```bash
ssh-add
```

OR

```bash
ssh-add /path/to/privatekey
```

You will have to enter your passphrase (if one is set). Afterwards, your identity file is added to the agent, allowing you to use your key to sign in without having to re-enter the passphrase again.

> "Enter passphrase for /home/demo/.ssh/id\_rsa:"
> "Identity added: /home/demo/.ssh/id\_rsa (/home/demo/.ssh/id\_rsa)"

---

## Agent Forwarding for Multiple Hops

To start, you must have your SSH agent started and your SSH key added to the agent (see earlier). After this is done, you need to connect to your first server using the `-A` option. This forwards your credentials to the server for this session:

```bash
ssh -A username@remote_host
```

---

## Server-Side & Client-Side Configuration Options

### Client Side

To edit the SSH client configuration:

```bash
nano ~/.ssh/config
```

**Options:**

```
Host RemoteServerName
    HostName RemoteServerIp
    Port 22                       # Port of the remote server
    User TheUsername              # The username on the remote server
    IdentityFile /path/to/PRIVATEKEY
    ServerAliveInterval 120       # Keep connection alive for 120s
```

After done, you can simply connect to the remote server like so:

```bash
ssh RemoteServerName
```

---

### Server Side

This is essential for security and convenience. The configuration file applies globally to all users under the remote server, but it's better to start with the following steps:

#### 1. Create a New User under the sudo Group

```bash
sudo adduser NewUserName
sudo usermod -aG sudo NewUserName
su - NewUserName
```

#### 2. Check for the public key existence for the new user

```bash
nano ~/.ssh/authorized_keys
```

If none, create the directory and copy the public key from the root user:

```bash
sudo mkdir -p /home/NewUserName/.ssh
sudo cp /root/.ssh/authorized_keys /home/NewUserName/.ssh/
```

Set ownership and permissions:

```bash
sudo chown -R NewUserName:NewUserName /home/NewUserName/.ssh
sudo chmod 700 /home/NewUserName/.ssh
sudo chmod 600 /home/NewUserName/.ssh/authorized_keys
chown -R NewUserName:NewUserName ~/.ssh
```

Check again and paste manually if it doesn't exist:

```bash
nano ~/.ssh/authorized_keys
```

#### 3. Server-Side SSH Daemon Configuration

Go to:

```bash
sudo nano /etc/ssh/sshd_config.d/50-cloud-init.conf
```

And set `PasswordAuthentication no`.

Then go to:

```bash
sudo nano /etc/ssh/sshd_config
```

Uncomment and set the following:

```
Port 22                  # or a different one
ListenAddress RemoteServerIp
PermitRootLogin no       # Disable root login
AllowUsers NewUserName@LocalHostIP
PubkeyAuthentication yes
PasswordAuthentication no
```

Save and exit (Ctrl+O, Enter, Ctrl+X).

After all is set, restart and check status of the SSH service:

```bash
sudo systemctl restart ssh
sudo systemctl status ssh
```

Try and login to the remote server:

```bash
ssh RemoteServerName
```
