FROM python:3.12-slim-bookworm
ENV PYTHONUNBUFFERED 1

WORKDIR /usr/src/app

# Setup SSH with secure root login
RUN apt-get update && apt-get install -y openssh-server \
 && mkdir /var/run/sshd \
 && echo 'root:password' | chpasswd \
 && sed -i 's/\#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
EXPOSE 22

RUN ssh-keygen -A

RUN apt-get install -y git build-essential libffi-dev
RUN apt-get install -y libproj-dev proj-bin libgdal-dev
RUN apt-get install -y libopenblas-dev
RUN apt-get install -y libgeos-dev

COPY requirements.txt /usr/src/app/
RUN pip install -r requirements.txt

COPY requirements-dev.txt /usr/src/app/
RUN pip install -r requirements-dev.txt

CMD ["/usr/sbin/sshd", "-D"]
