# DailySpin Makefile
HUGO?=hugo
TITLE?=
FILE?=
DATE?=

setup:
	git init
	$(HUGO) new site .
	@echo "Remember to: git remote add origin git@github.com:<you>/dailyspin.git"

theme:
	git submodule add https://github.com/ismd/hugo-theme-vng-blue.git themes/vng-blue || true

new:
	@if [ -z "$(TITLE)" ]; then echo "Provide TITLE=\"Song – Artist\""; exit 1; fi
	./ds new "$(TITLE)"

schedule:
	@if [ -z "$(FILE)" ] || [ -z "$(DATE)" ]; then echo "Provide FILE=... DATE=YYYY-MM-DD"; exit 1; fi
	./ds schedule "$(FILE)" "$(DATE)"

serve:
	$(HUGO) server -D

build:
	$(HUGO) --minify

publish: build
	git add -A
	git commit -m "Publish"
	git push

workflow:
	mkdir -p .github/workflows
	cp .github/workflows/publish.yml .github/workflows/publish.yml 2>/dev/null || true
