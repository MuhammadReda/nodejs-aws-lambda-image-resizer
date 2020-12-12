FROM amazonlinux:2.0.20200722.0

# install dependencies
RUN yum -y install make gcc*
RUN curl --silent --location https://rpm.nodesource.com/setup_12.x | bash -
RUN yum -y install nodejs
RUN yum -y install zip

# create directories
RUN mkdir /app /build

# copy source code
COPY ./app/* /app/

# install npm dependencies
WORKDIR /app
RUN npm install

# build app
WORKDIR /app
RUN zip -r /build/build.zip .

# put container to sleep in order to copy the build
CMD sleep 10m
