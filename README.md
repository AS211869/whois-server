# whois-server

This is a simple file-based WHOIS server.

After running for the first time, a data directory will be created containing subdirectories for the supported WHOIS data types: ASN, Domain, IPv4, IPv6. Create your WHOIS data files in the appropriate directories. Queries will be matched against the lowercased file name. For IP files, the file name is the CIDR, replacing `:` with `-` and `/` with `_`.

This whois server also supports referrals. To add a referral, add a `_REFER` field in the relevant WHOIS data file, with the data set to the WHOIS server the request should be referred to. Example: `_REFER: whois://whois.ripe.net`. Your WHOIS client must support ARIN style referrals for this to work.

Lines starting with an underscore are ignored. All changes to data, including IPAM data, will only be shown after a restart.

This whois server also supports getting data from phpIPAM v1.4+.