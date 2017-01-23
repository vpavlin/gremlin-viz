FROM centos

MAINTAINER Vasek Pavlin <vasek@redhat.com>
EXPOSE 8080
CMD npm start

RUN yum -y install epel-release
RUN yum -y install nodejs npm

ADD . /opt
WORKDIR /opt

RUN npm install
USER 1000
