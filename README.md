# whois-server

This is a simple file-based WHOIS server.

After running for the first time, a data directory will be created containing subdirectories for the supported WHOIS data types: ASN, Domain, IPv4, IPv6. Create your WHOIS data files in the appropriate directories. Queries will be matched against the lowercased file name. For IP files, the file name is the CIDR, replacing `:` with `-` and `/` with `_`.

This whois server also supports comments and actions:
- `_REFER` can be uesd to add a referral to another WHOIS server. Example: `_REFER: whois://whois.ripe.net`. Your WHOIS client must support ARIN style referrals for this to work.
- `_PULL` can be used to pull data from other WHOIS servers at a regular interval (set using `dynamicPullInterval` in the config file, defaults to 2 hours). This will create files starting with `d_` in the data directory. To avoid ratelimiting, all data pulls will be evenly spread over the interval. WHOIS queries will still show old data until the data updater runs. Unlike the refer, the protocol is not required and specifying a port works differently. Example: `_PULL: whois.ripe.net 43`.
- `_COMMENT` can be used to add comments. While lines starting with underscores are ignored (with the exception of the actions above), `_COMMENT` is guaranteed to never be used as an action command.

Data updates will take effect every 15 minutes by default. Changes to action fields may only apply after a restart.

This whois server also supports getting data from phpIPAM v1.4+.