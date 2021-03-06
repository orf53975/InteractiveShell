import ssh2 = require("ssh2");
import fs = require("fs");

import {Instance} from "./instance";
import {InstanceManager} from "./instanceManager";

class SshDockerContainersInstanceManager implements InstanceManager {
  private resources: any;
  private hostConfig: ssh2.ConnectConfig & {containerType?: string,
    maxContainerNumber?: number, dockerRunCmd?: string, dockerCmdPrefix?: string,
    sshdCmd?: string, sshKey?: string};
  private guestInstance: any;
  private currentContainers: any[];

  constructor(resources: any, options: any, currentInstance: Instance) {
    this.resources = resources;
    this.guestInstance = currentInstance;
    this.hostConfig = options;
    const currentContainers = [];
    this.currentContainers = currentContainers;
    this.init();
  }

  public updateLastActiveTime(instance: Instance) {
    instance.lastActiveTime = Date.now();
  }

  public getNewInstance(next) {
    if (this.currentContainers.length >= this.hostConfig.maxContainerNumber) {
      this.killOldestContainer(next);
    } else {
      const currentInstance = JSON.parse(JSON.stringify(this.guestInstance));
      this.guestInstance.port++;
      currentInstance.containerName = "m2Port" + currentInstance.port;
      this.connectWithSshAndCreateContainer(currentInstance, next);
    }
  }

  private init = function() {
    this.hostConfig.dockerRunCmd = this.hostConfig.dockerCmdPrefix + " docker run -d";
    this.hostConfig.dockerRunCmd += " --cpu-shares " + this.resources.cpuShares;
    this.hostConfig.dockerRunCmd += " -m " + this.resources.memory + "m";
    this.hostConfig.dockerRunCmd += " --name";
  };

  private connectWithSshAndCreateContainer = function(instance: Instance, next) {
    const self = this;
    const dockerRunCmd = self.getDockerStartCmd(instance);
    self.connectToHostAndExecCmd(dockerRunCmd, function(stream) {
      stream.on("data", function(dataObject) {
        instance.containerId = dataObject.toString();
        self.checkForSuccessfulContainerStart(instance, next);
      });
      stream.stderr.on("data", function(dataObject) {
        // If we get stderr, there will not come an id, so don't be
        // afraid of data.
        const data = dataObject.toString();
        if (data.match(/ERROR/i)) {
          self.getNewInstance(next);
          stream.end();
        }
      });
    }, next);
  };

  private removeInstance(instance: Instance, next) {
    const self = this;
    console.log("Removing container: " + instance.containerName);
    if (instance.killNotify) {
      instance.killNotify();
    }
    const removalCommand = self.hostConfig.dockerCmdPrefix + " docker rm -f " +
        instance.containerName;
    self.connectToHostAndExecCmd(removalCommand, function(stream) {
      self.removeInstanceFromArray(instance);
      if (next) {
        next();
      }
    });
  }

  private getDockerStartCmd(instance: Instance) {
    let result = this.hostConfig.dockerRunCmd;
    result += " " + instance.containerName;
    result += " -p " + instance.port + ":22";
    result += " " + this.hostConfig.containerType + " " + this.hostConfig.sshdCmd;
    return result;
  }

  private removeInstanceFromArray = function(instance: Instance) {
    const position = this.currentContainers.indexOf(instance);
    this.currentContainers.splice(position, 1);
  };

  private addInstanceToArray = function(instance: Instance) {
    this.currentContainers.push(instance);
  };

  private isLegal = function(instance: Instance) {
    const age = Date.now() - instance.lastActiveTime;
    return age > this.hostConfig.minContainerAge;
  };

  private sortInstancesByAge = function() {
    this.currentContainers.sort(function(a, b) {
      return a.lastActiveTime - b.lastActiveTime;
    });
  };

  private checkForSuccessfulContainerStart = function(instance: Instance, next) {
    const self = this;
    const getListOfAllContainers = self.hostConfig.dockerCmdPrefix +
        " docker ps --no-trunc | grep " +
        instance.containerName +
        " | wc -l";
    self.connectToHostAndExecCmd(getListOfAllContainers, function(stream) {
      stream.on("data", function(dataObject) {
        const data = dataObject.toString();
        if (data === "") {
          self.getNewInstance(next);
        } else {
          self.checkForRunningSshd(instance, next);
        }
      });
    }, next);
  };

  private checkForRunningSshd(instance: Instance, next) {
    const self = this;
    const getContainerProcesses = self.hostConfig.dockerCmdPrefix + " docker exec " +
        instance.containerName + " ps aux";
    const filterForSshd = "grep \"" + self.hostConfig.sshdCmd + "\"";
    const excludeGrepAndWc = "grep -v grep | wc -l";
    const sshdCheckCmd = getContainerProcesses + " | " + filterForSshd + " | " +
        excludeGrepAndWc;
    self.connectToHostAndExecCmd(sshdCheckCmd, function(stream) {
      stream.on("data", function(dataObject) {
        const data = dataObject.toString();
        if (data === "") {
          self.checkForRunningSshd(instance, next);
        } else {
          instance.lastActiveTime = Date.now();
          self.addInstanceToArray(instance);
          next(null, instance);
        }
      });
    }, next);
  }

  private connectToHostAndExecCmd(cmd, next, errorHandler?) {
    const connection: ssh2.Client = new ssh2.Client();
    connection.on("ready", function() {
      connection.exec(cmd, function(err, stream) {
        if (err) {
          throw err;
        }
        stream.on("close", function() {
          connection.end();
        });
        stream.on("end", function() {
          stream.close();
          connection.end();
        });
        stream.on("Error", function(error) {
          console.log("Error in stream: " + error);
        });
        next(stream);
      });
    }).on("error", function(error) {
      console.log("Error while sshing: " + error + "\nTried to do: " + cmd);
      if (errorHandler) {
        errorHandler(error);
      }
    }).connect({
      host: this.hostConfig.host,
      port: this.hostConfig.port,
      username: this.hostConfig.username,
      privateKey: fs.readFileSync(this.hostConfig.sshKey),
    });
  }

  private killOldestContainer = function(next) {
    const self = this;
    self.sortInstancesByAge();
    if (self.isLegal(self.currentContainers[0])) {
      self.removeInstance(self.currentContainers[0], function() {
        self.getNewInstance(next);
      });
    } else {
      throw new Error("Too many active users.");
    }
  };
}

export {SshDockerContainersInstanceManager as SshDockerContainers};
