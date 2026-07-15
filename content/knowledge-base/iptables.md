---
title: Introduction to iptables
description: A beginner-friendly introduction to configuring the Linux firewall using iptables.
date: 2026-07-15
image: /knowledge-base/iptables.png
readingTime: 5
contentType: guide
category: devops
tags:
 - iptables
 - Linux
 - Networking
 - Security
---

iptables is a powerful firewall tool built into the Linux kernel's networking stack. It allows administrators to define rules that control how network packets are handled (filtered, modified, or forwarded) by the system. Under the hood, iptables works with the Linux netfilter framework -- a series of hooks in the kernel that inspect packets at various points. By adding iptables rules, you're instructing the kernel on what to do with packets (e.g., accept, drop, modify) based on specified criteria. This makes iptables central to packet filtering (firewalling) and Network Address Translation (NAT) on Linux systems.

Netfilter and Stateful Filtering: iptables operates as part of netfilter, meaning it can track connections (stateful inspection). Packets aren't treated in isolation; the kernel connection tracking system notes which packets belong to an established session. This allows iptables to have rules like "allow established connections" rather than having to allow every response packet explicitly. (For example, a rule can match `ESTABLISHED` state to permit reply traffic.) By default, iptables has no rules until configured -- all behavior is defined by user-set rules and policies. Many Linux distributions ship with a default iptables policy (often via tools like UFW or firewalld) that initially accepts or drops traffic according to security best practices (commonly default deny incoming, allow outgoing, etc.).

iptables Tables: filter, nat, mangle, and raw
---------------------------------------------

iptables organizes rules into tables, each for a different purpose. The main tables you'll encounter are:

-   filter table: The default table for firewall rules. It's used for making filtering decisions -- i.e., whether to allow or block packets. Most "classic" firewall rules (allowing SSH, blocking an IP, etc.) reside in the filter table. If a rule is about permitting or denying traffic, it goes here.

-   nat table: This table handles Network Address Translation rules, which modify packet source or destination addresses. For instance, port forwarding (destination NAT) and Masquerading (a form of source NAT) are implemented in the nat table. Rules here usually apply only to the first packet of a new connection (connection tracking ensures subsequent packets use the same NAT decision).

-   mangle table: Used for specialized packet alterations. The mangle table can modify packet headers -- e.g., changing the TTL (Time To Live) or TOS/DSCP fields for QoS, or marking packets internally. It's not for filtering or NAT, but for adjustments that affect how packets are treated. For example, mangle can attach a mark to a packet (an internal tag in the kernel) for use by other subsystems (such as routing or traffic shaping).

-   raw table: A special table consulted very early in packet processing, used mainly to exempt packets from connection tracking. The raw table's primary (and very narrow) function is to mark packets with a `NOTRACK` target if you want certain traffic to bypass the state tracking system. This table is rarely used unless you have specific performance or tracking-exclusion needs.

::note
There is also a security table used to apply SELinux security context marks on packets. It's only relevant on systems with Mandatory Access Control policies like SELinux.
::

Each table contains chains where rules are actually placed. Some tables share chain names, but the chains in each table are independent (for example, both the filter and mangle tables have an `INPUT` chain, but you might use the filter `INPUT` to decide on packet acceptance and the mangle `INPUT` to modify packet bits).

Chains and Packet Flow in iptables
----------------------------------

Chains represent stages of packet processing. iptables has five built-in chain names which correspond to key routing points in the netfilter architecture:

-   PREROUTING: Applies to incoming packets before the system makes a routing decision (i.e., before it decides if the packet is destined for the local machine or should be forwarded onward). This is typically used for DNAT (destination NAT) -- e.g., port forwarding -- since you might need to alter the packet's destination *before* routing. The nat and mangle tables have PREROUTING chains (raw does as well), allowing NAT and header tweaks on inbound packets immediately as they arrive.

-   INPUT: Applies to packets *destined for the local system* (after routing has determined the packet is for us). The INPUT chain in the filter table is where you decide to accept or drop incoming traffic to the host itself. Mangle and security tables also have INPUT chains (for modifying or labeling packets heading to local sockets). If a packet is addressed to this machine, it will hit PREROUTING first, then go to INPUT (after some other processing).

-   FORWARD: Applies to packets that are routed *through* your machine (not local delivery). If your Linux box is acting as a router or gateway, packets not aimed at it will hit the FORWARD chain. The filter table's FORWARD chain is where you permit or block transit traffic. (Mangle and security also have FORWARD chains for modifications.) Inbound packets trigger PREROUTING, then hit FORWARD (if not local), then POSTROUTING on the way out.

-   OUTPUT: Applies to packets originating from the local system (i.e. locally generated by an application on your server). Before such a packet leaves, it traverses the OUTPUT chains. For example, the filter table's OUTPUT chain could filter outgoing traffic; the nat table's OUTPUT chain could do DNAT for locally generated connections (rare, but for scenarios like redirecting local traffic to a proxy); the mangle OUTPUT can mark or modify local out packets. A packet created locally goes through OUTPUT then POSTROUTING before hitting the wire.

-   POSTROUTING: Applies after routing is decided, just before the packet leaves the system. POSTROUTING is commonly used for SNAT (source NAT) such as MASQUERADE, because once we know the outgoing interface and have made routing decisions, we can alter the source address if needed. The nat table's POSTROUTING chain is where you put MASQUERADE/SNAT rules. The mangle table's POSTROUTING can also adjust packets (e.g., tweak QoS bits) right as they exit.

These chains form the path a packet takes. In summary:

-   Incoming to local host: `PREROUTING` (nat/mangle) -> routing decision -> `INPUT` (filter, etc.) -> local process.

-   Incoming to be forwarded: `PREROUTING` -> routing decision -> `FORWARD` -> `POSTROUTING` -> out to next hop.

-   Outgoing from local host: `OUTPUT` -> routing decision -> `POSTROUTING` -> out to network.


Within each chain, rules are evaluated in order (top to bottom). When a packet matches a rule, a corresponding target action is taken. Some targets (like DROP or ACCEPT) are *terminating* --- meaning no further rules in that chain are checked once they hit --- while others (like `LOG` or `MARK`) are non-terminating and evaluation will continue to the next rule. If a packet reaches the end of a built-in chain without matching any rule, the chain's policy (default action) is applied (which could be ACCEPT or DROP for the chain). You can also create user-defined chains and use a `-j <chain>` jump target to send packets to those for better organization, but the built-in ones above are where packets enter from the kernel's perspective.

iptables Rule Syntax and Structure
----------------------------------

You interact with iptables via the `iptables` command-line utility (for IPv4) and `ip6tables` (for IPv6) -- though many distros now use a variant that handles both, or use nftables in compatibility mode (more on that later). The basic syntax of an iptables rule is:

```bash
iptables [-t <table>] -A <chain> [match criteria] -j <target>
```

For example, `iptables -A INPUT -p tcp --dport 22 -j ACCEPT` means "Append to the INPUT chain a rule that matches TCP packets destined to port 22, and Jump to target ACCEPT (allow it)". Key components of rules:

-   Table and Chain: You specify which *table* (`-t`) and *chain* to operate on. If `-t` is omitted, it defaults to the filter table. `-A` (append) adds the rule to the end of the given chain. You can also use `-I` to insert at a certain position, `-D` to delete, `-P` to set chain policy, etc.

-   Match criteria: These are conditions a packet must meet to trigger the rule. Common matches include:

    -   Protocol (`-p tcp`, `-p udp`, `-p icmp`, etc.).

    -   Source or destination IP (`-s 203.0.113.5` or `-d 10.1.1.0/24`).

    -   Source or destination port (`--dport 80` or `--sport 53` for UDP/TCP).

    -   Interface (`-i eth0` for incoming on eth0, or `-o wg0` for outgoing interface).

    -   Connection state (`-m conntrack --ctstate NEW,ESTABLISHED` to match packets that are starting a new connection or part of an existing one, for instance).

    -   Many others: You can match on TCP flags, ICMP types, packet markings, etc., using extension modules (`-m <module>`). The matching system is very flexible.

-   Target (action): The `-j <target>` specifies what to do if the packet matches. Built-in targets include ACCEPT (let the packet through), DROP (silently discard it), REJECT (discard and send an ICMP error back), LOG (log the packet details and continue), MASQUERADE, DNAT, SNAT (for NAT in the nat table), MARK (mark the packet in mangle), RETURN (stop processing in a user-defined chain and go back), etc. The target can also be a jump to a user-defined chain.

Stateful rules example: A common pattern is to use connection tracking to simplify rules. For instance, in the filter `INPUT` chain, one might allow established traffic with a rule like `-A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT` (meaning any packet that is part of an existing connection or related to one is accepted). Then you only specifically allow new inbound connections on certain ports (e.g., `-A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -j ACCEPT` for SSH, etc.), and drop everything else by default. This way, return traffic from your machine (like replies to outbound requests) is automatically permitted because it's ESTABLISHED, even if your default policy is to drop unsolicited incoming packets.

Practical Examples with iptables
--------------------------------

Let's go through some common use-cases and how you'd implement them with iptables rules. These examples assume we're manipulating IPv4 rules (using the `iptables` command) and that default policies are set to a secure baseline (e.g., default DROP for incoming traffic, etc.), though the concepts apply generally.

### Basic Packet Filtering (Allowing/Blocking Traffic)

-   Allowing specific inbound ports: Suppose you want to allow incoming HTTP and SSH traffic to your server. In iptables filter table, that means adding rules to the `INPUT` chain for those ports. For example, to allow TCP port 80 (HTTP) and 22 (SSH) you would run:

    ```bash
    iptables -A INPUT -p tcp --dport 80 -j ACCEPT
    iptables -A INPUT -p tcp --dport 22 -j ACCEPT
    ```

    This appends rules permitting TCP packets destined for port 80 and 22 to be accepted. (You would likely also allow port 443 for HTTPS, etc., in a similar way.)

-   Blocking a specific IP address: If there's a malicious host (say 203.0.113.45) that you want to block from even reaching your server, you can add a DROP rule targeting that source. For instance:

    ```bash
    iptables -A INPUT -s 203.0.113.45 -j DROP
    ```

    This means any packet with source IP 203.0.113.45 arriving at your server is immediately dropped. Typically, such a rule is placed near the top of the chain (using `-I INPUT 1` to insert at the top) so it takes effect before other rules (ensuring that IP is blocked unconditionally).

-   Dropping all other unsolicited traffic: In a simple firewall, after allowing a few safe services, you'd usually drop the rest. You can either set the default policy of `INPUT` to DROP (`iptables -P INPUT DROP`) and then whitelist ports, or place a broad rule like `iptables -A INPUT -j DROP` at the end of the chain. The policy method is often cleaner. Don't forget to allow essential traffic (like allowing loopback interface traffic `-A INPUT -i lo -j ACCEPT`, and perhaps pings or DNS replies as needed) and, as noted, use connection tracking to allow replies (ESTABLISHED) without needing explicit rules for them.

### Port Forwarding (DNAT Example)

Port forwarding is when your firewall/gateway machine listens on a port and forwards those packets to an internal host. This is done with Destination NAT (DNAT) in the `nat` table's PREROUTING chain. For example, imagine you have a gateway with public IP and an internal webserver at `10.0.0.1` on a private network. To forward port 80 from the gateway to the internal webserver, you could use:

```bash
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j DNAT --to-destination 10.0.0.1:80
```

This means: for packets arriving on interface eth0 (assumed to be the public interface) with TCP destination port 80, rewrite the destination IP to `10.0.0.1` (and port 80). Now the packet will be sent to the internal host. However, the internal host's replies need to get back to the original client. Two additional things are needed for this setup to work properly:

1.  IP Forwarding enabled: The Linux kernel must be allowed to forward packets. Ensure `/proc/sys/net/ipv4/ip_forward` is `1` (you can set this in `/etc/sysctl.conf` and apply with `sysctl -p`).

2.  Source NAT for replies: If the internal webserver `10.0.0.1` tries to reply directly to the client on the internet, the packets might get dropped (often, private IP to public internet will be blocked by ISP or won't route properly). Also, the client would see a reply from an IP it didn't send to. To fix this, you SNAT the outgoing packet so that replies go back through the gateway. For instance:

    ```bash
    iptables -t nat -A POSTROUTING -p tcp -d 10.0.0.1 --dport 80 -j MASQUERADE
    ```

    This rule (in nat `POSTROUTING`) will masquerade the source of the forwarded packets, making them appear from the gateway's IP. In effect, the internal server's replies will go to the gateway, which will then DNAT them back to the client. (`MASQUERADE` is a variant of SNAT that automatically uses the outgoing interface's address -- more on it below.) The combination of DNAT in PREROUTING and SNAT/MASQUERADE in POSTROUTING ensures the port forward works both ways. Don't forget to also allow the forwarded traffic in the `filter` table's FORWARD chain (e.g., `-A FORWARD -p tcp -d 10.0.0.1 --dport 80 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT`, plus a rule for the ESTABLISHED replies) if your default FORWARD policy is DROP.

After these rules, anyone hitting port 80 on the gateway's public IP will actually reach the internal host. This is how you "expose" a service from an internal network to the outside using iptables.

### Source NAT (MASQUERADE) for Outgoing Traffic

The nat POSTROUTING chain is typically used for outbound NAT. A common scenario is a Linux machine acting as a router for a private LAN out to the internet. The LAN hosts have private IPs (e.g., 192.168.1.x) which aren't routable on the internet, so the router uses NAT to masquerade their traffic behind its public IP. This is done with the `MASQUERADE` target on the router's external interface.

For example, to enable NAT for a LAN `192.168.1.0/24` going out via interface `eth1` (suppose `eth1` is the uplink):

```bash
iptables -t nat -A POSTROUTING -s 192.168.1.0/24 -o eth1 -j MASQUERADE
```

This rule says: for packets coming from source network 192.168.1.0/24 and leaving out `eth1`, perform masquerading (i.e., replace their source IP with the router's `eth1` IP). The MASQUERADE target is basically a dynamic form of SNAT -- it's ideal if your external IP may change (like a DHCP client) because it always uses the current interface address. The result is that to external servers, all traffic from the LAN appears to come from the router's single public IP. Multiple devices share one IP this way, and return traffic automatically gets un-NATed back to the correct LAN host. This is the essence of IP masquerading, allowing many clients to share a single public address for internet access.

Key points when using MASQUERADE/SNAT: enable IP forwarding (as mentioned) and usually set appropriate firewall rules in FORWARD chain to restrict what traffic is allowed out or in. Also note that MASQUERADE is usually only needed on the router/gateway device; clients on the LAN don't need to run iptables for this purpose.

::tip
You could also use a static SNAT rule like `-j SNAT --to-source <IP>` if you know the exact public IP and it's static. MASQUERADE is simpler for most cases and automatically handles picking the IP. In iptables, MASQUERADE is actually a special case of SNAT.
::

### Marking Packets and Altering Headers (Advanced mangle usage)

The mangle table provides capabilities to modify packet headers or mark packets for special handling:

-   Packet Marking: Using the MARK target, you can assign an internal mark to packets. This mark isn't part of the packet that goes over the network; it's a tag stored in kernel space alongside the packet. Marks are often used in advanced setups like policy routing (with `ip rule`/`ip route` directives that route packets differently based on mark) or Quality of Service (traffic shaping) where you want to treat certain traffic uniquely. For example, you might mark all packets going to a certain IP or port. A sample rule:

    ```bash
    iptables -t mangle -A PREROUTING -p tcp --dport 22 -j MARK --set-mark 2
    ```

    This marks all TCP packets headed to port 22 (SSH) with a mark value of `2`. By itself, marking does nothing visible, but another tool or later rule can use this mark. For instance, you could have a traffic shaper give priority to packets with mark 2, or use `ip rule` to route those through a VPN. The mangle table's PREROUTING (or OUTPUT, etc., depending on traffic direction) is where you'd place such rules. Remember, MARK does not alter the packet's content -- it's internal to the kernel's bookkeeping.

-   Changing TOS/DSCP or TTL: Mangle allows modifying certain header fields. For example, the TTL target can reduce or set the Time To Live of a packet. Why would you do this? A classical use-case: some ISPs detected multiple devices behind one connection by noticing different TTL values coming out (since each OS might use different initial TTLs). By forcing all outgoing packets to a fixed TTL, you could obscure that. For instance:

    ```bash
    iptables -t mangle -A POSTROUTING -o eth0 -j TTL --ttl-set 64
    ```

    This would set the TTL of all packets leaving on eth0 to 64. Another example is changing TOS/DSCP bits (Type of Service/DiffServ Code Point) to mark traffic as low-latency or bulk. For instance, using `-j TOS --set-tos 0x10` (old TOS) or `-j DSCP --set-dscp CS1` to mark packets for QoS in your network. These modifications can influence routing or handling by other devices that respect those fields.

-   Example -- Throttling bulk traffic via DSCP: You could mark, say, all outgoing FTP traffic with a DSCP value indicating "lower priority". E.g.:

    ```bash
    iptables -t mangle -A OUTPUT -p tcp --dport 21 -j DSCP --set-dscp 0x08
    ```

    This sets the DSCP field to "Low Priority Data" for outbound FTP control packets (just an example). Your router or ISP could then de-prioritize such traffic.

-   Other mangle uses: There are targets like `TCPMSS` (often used in mangle FORWARD chain) to adjust the TCP Maximum Segment Size of packets, which can prevent issues with Path MTU discovery in cases of misconfigured networks. For example, `-A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1360` can clamp the MSS to a lower value to avoid fragmentation issues on VPNs or PPPoE links. In short, mangle is a toolbox for any packet modifications or markings that aren't simply "filter or NAT".

Comparing iptables with UFW, nftables, and firewalld
----------------------------------------------------

Linux has multiple tools and layers for firewall management. iptables is low-level and powerful, but other systems exist to simplify or replace it. Here's how iptables contrasts with some commonly used alternatives:

-   UFW (Uncomplicated Firewall): UFW is essentially a *front-end for iptables*. It provides a simplified syntax for common tasks, so users don't have to write raw iptables commands. For example, `ufw allow 22/tcp` will add the appropriate iptables rules to allow SSH. UFW was developed with Ubuntu in mind, aiming to make firewall configuration easy for beginners. Under the hood, on traditional systems UFW just manipulates iptables; on newer Ubuntu systems using nftables, UFW can output nftables rules, but the user doesn't see that. The main point is that UFW does not replace iptables's functionality -- it leverages it. The trade-off is simplicity vs. granularity: UFW handles basic needs with simple commands (including some nice features like application profiles), but for complex scenarios (like marking packets, custom chains, advanced NAT), you'd revert to raw iptables. In summary, UFW is great for quick setups and for those unfamiliar with iptables syntax, but it's essentially iptables under the hood.

-   nftables: nftables is the modern successor to iptables. Introduced in Linux 3.13 (around 2014) and increasingly the default on many distributions, nftables replaces the iptables CLI and the underlying packet filtering engine with a more unified and efficient system. Key differences: nftables uses a single subsystem for IPv4/IPv6/Bridge/etc (no separate iptables/ip6tables binaries) and a new syntax that is more concise. It also can use sophisticated data structures (like sets and maps) in the kernel for efficient rule handling, meaning large rule sets perform better than in iptables (where rules are checked sequentially). In nftables, instead of fixed tables and chains, you can create your own tables and chains as needed (though commonly one uses similar concepts like an `inet filter` table that covers both v4 and v6). Many distributions have transitioned to using nftables by default, sometimes with an iptables compatibility layer (so the `iptables` command you run is actually translating to nft rules in the background). If you're starting fresh or need performance with lots of rules, nftables is generally recommended as it's the future of Linux firewalls. However, iptables is still widely used and valid; both systems can coexist (though you should avoid using them at exactly the same time on the same machine to prevent conflicts).

-   firewalld: firewalld is a higher-level firewall management service that typically uses nftables or iptables under the hood depending on the system. It is the default on Red Hat and related distros. The core idea of firewalld is a dynamic, zone-based firewall: it abstracts firewall rules into "zones" (like *public*, *home*, *internal*, *dmz*, etc.), each with a certain trust level and set of allowed services. Network interfaces get assigned to zones. This is conceptually easier for some users -- e.g., you might say "eth0 is in the public zone, only allow SSH and HTTP" without manually writing port rules each time. Firewalld runs as a daemon and can apply rule changes live without dropping existing connections (iptables by itself can't easily do that without careful scripting). It provides a D-Bus API and CLI (`firewall-cmd`) for management. In practice, firewalld on modern systems leverages nftables. If someone enables firewalld, they should not manually use iptables at the same time (firewalld will overwrite or conflict with direct iptables changes unless put into a direct rule). The advantage of firewalld is easier management of complex rule sets (especially when using zones or rich rules) and integration with services (many apps ship firewalld service definitions). The disadvantage is an extra layer of abstraction -- for very custom setups, some find it cumbersome and prefer raw iptables/nftables. But for most, firewalld provides a good balance between simplicity and flexibility (more so than UFW, it's more enterprise-featured, allowing both simple service-based rules and complex rich rules).

In essence, iptables vs UFW vs firewalld comes down to direct control versus user-friendliness: iptables (and nftables) give you fine-grained control and are ideal for experienced users or complex policies, whereas UFW and firewalld build on top of those to offer simpler interfaces for common scenarios. And iptables vs nftables is about old versus new technology: nftables aims to eventually replace iptables with a more efficient and unified system, but iptables is still fully functional and in use, often through compatibility layers. Many firewall frontends (like UFW, firewalld) have adapted to use nftables on systems where iptables is deprecated, but conceptually, if you understand iptables, that knowledge transfers to nftables (the concepts of tables, chains, rules, and matches/targets -- or "verdicts" in nftables -- remain, just with different syntax and capabilities).

Summary: iptables is a robust, if sometimes complex, tool at the heart of Linux firewalling. Tools like UFW and firewalld simplify firewall configuration by abstracting iptables/nftables rules into easier commands or zone policies, which is great for quick setups or less experienced users. nftables is the newer framework that improves on iptables' design, offering better performance and a more streamlined rule language, representing the future of Linux packet filtering. Regardless of which tool is used on the surface, the fundamental ideas -- defining how packets are handled based on conditions -- remain the same. Understanding iptables' tables, chains, and rule logic gives you a strong foundation for working with any of these firewall tools and for securing Linux networks effectively.