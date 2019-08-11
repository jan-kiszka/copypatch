#
# Copy Patch Thunderbird Add-On
#
# Copyright (c) Jan Kiszka, 2019
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

RELEASE_TAG=$(shell git describe --match "[0-9].[0-9]*")
ARCHIVE_NAME=$(PACKAGE_NAME)-$(RELEASE_TAG).xpi

PACKAGE_FILES= \
	$(shell find chrome) \
	chrome.manifest \
	install.rdf \
	bootstrap.js \
	COPYING

UPDATE_VERSION="s|    <em:version>.*|    <em:version>$(VERSION)</em:version>|"

all package: clean $(PACKAGE_FILES)
	zip -r $(ARCHIVE_NAME) $(PACKAGE_FILES)

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
	${Q}sed -i $(UPDATE_VERSION) install.rdf
	git commit -s install.rdf -m "Bump version number"
	git tag -as $(VERSION) -m "Release $(VERSION)"

.PHONY: clean release
