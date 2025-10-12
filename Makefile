#
# Copy Patch Thunderbird Add-On
#
# Copyright (c) Jan Kiszka, 2019-2025
#
# Authors:
#  Jan Kiszka <jan.kiszka@web.de>
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

ifeq ($(V),1)
	Q =
else
	Q = @
endif

PACKAGE_NAME=copypatch

RELEASE_TAG=$(shell git describe --match "[0-9].[0-9]*" --dirty)
ARCHIVE_NAME=$(PACKAGE_NAME)-$(RELEASE_TAG).xpi

PACKAGE_FILES= \
	manifest.json \
	*.png \
	background.html \
	background-script.js \
	dialog.js \
	node_modules/email-addresses/LICENSE \
	node_modules/email-addresses/lib/email-addresses.js \
	COPYING

UPDATE_VERSION='s|"version":.*|"version": "$(VERSION)",|'

all package: clean node_modules $(PACKAGE_FILES)
	zip -r $(ARCHIVE_NAME) $(PACKAGE_FILES)

node_modules: package.json
	npm install
	sed -i 's/(this)/(globalThis)/' node_modules/email-addresses/lib/email-addresses.js

distclean: clean
	rm -rf node_modules

clean:
	rm -f $(ARCHIVE_NAME)

release:
	${Q}if [ -z "$(VERSION)" ]; then		\
		echo "VERSION is not set";		\
		exit 1;					\
	fi
	${Q}if [ -n "`git status -s -uno`" ]; then	\
		echo "Working directory is dirty!";	\
		exit 1;					\
	fi
	${Q}sed -i $(UPDATE_VERSION) manifest.json
	git commit -s manifest.json -m "Bump version number"
	git tag -as $(VERSION) -m "Release $(VERSION)"

.PHONY: clean distclean release
