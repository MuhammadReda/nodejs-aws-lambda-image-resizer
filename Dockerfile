FROM node:22-bookworm-slim

# zip is used to package the Lambda deployment bundle
RUN apt-get update && apt-get install -y --no-install-recommends zip && rm -rf /var/lib/apt/lists/*

# create directories
RUN mkdir /app /build

# copy source code
COPY ./app/ /app/

# install production dependencies with Sharp binaries for Lambda (Linux x64, glibc)
WORKDIR /app
RUN npm ci --omit=dev --os=linux --cpu=x64 --libc=glibc

# build app
RUN zip -r /build/build.zip .

# put container to sleep in order to copy the build
CMD sleep 10m
