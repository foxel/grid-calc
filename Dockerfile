FROM ubuntu:14.04
MAINTAINER Andrey F. Kupreychik <foxel@quickfox.ru>

ENV DEBIAN_FRONTEND=noninteractive

RUN \
  apt-get update && \
  apt-get -y --no-install-recommends install \
    node-gyp make g++ gcc nodejs-legacy npm && \

  update-locale LANG=C.UTF-8 && \
  rm -rf /var/lib/apt/lists/*

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install

COPY lib/ /usr/src/app/lib/
COPY public_html/ /usr/src/app/public_html/
COPY views/ /usr/src/app/views/
COPY server.js /usr/src/app/

EXPOSE 8080
VOLUME /usr/src/app/uploads/
CMD [ "npm", "start" ]
