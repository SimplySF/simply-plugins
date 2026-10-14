# error.unreadableFile

Couldn't read state definitions from %s: %s

# flags.file.summary

JSON file mapping ISO 3166-2 codes to state names, e.g. {"US-CA": "California"}.

# flags.iso-codes.summary

Download the states from this ISO 3166-2 source at run time, instead of reading a file.

# flags.iso-codes.description

"debian" is Debian's iso-codes project (https://salsa.debian.org/iso-codes-team/iso-codes). The data is downloaded each time the command runs and is never stored, so it's always as current as the version you choose. Downloads honor the HTTPS_PROXY and NO_PROXY environment variables.

# flags.iso-codes-version.summary

Version of the --iso-codes source to use. For "debian", a tag such as v4.20.1, or a branch such as main. Defaults to the latest release.

# flags.all-levels.summary

Include subdivisions nested under another subdivision, such as French departments under their regions. By default only top-level subdivisions are used.

# info.downloading

Downloading ISO 3166-2 data (%s)

# info.source

Using %s %s: %s states (%s).

# info.sourceForCountries

Using %s %s: %s states for %s (%s).

# info.source.topLevel

top level only

# info.source.allLevels

all levels
