FROM ubuntu:latest

ARG HUGO_VERSION=0.152.2

RUN apt-get update && apt-get install -y wget sudo

RUN wget -O /tmp/hugo.deb https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_${HUGO_VERSION}_linux-arm64.deb \
    && sudo dpkg -i /tmp/hugo.deb