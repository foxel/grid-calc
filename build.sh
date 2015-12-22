#!/bin/bash

set -e

bower install

docker build -t grid-calc .

# docker save sibcode2015 | gzip | ssh target 'gunzip | docker load'

docker stop server && docker rm server || true

docker run --name server --restart always -d -p 80:8080 -v /docker/data:/usr/src/app/uploads grid-calc
