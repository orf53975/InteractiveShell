import {AuthOption} from "../lib/enums";

const configuration = function(inputOptions, next) {
  const options = {
    cookieName: "tryM2",
    authentication: AuthOption.none,
    serverConfig: {
      CONTAINERS: "../lib/LocalContainerManager",
      MATH_PROGRAM: "Macaulay2",
      MATH_PROGRAM_COMMAND: "M2",
      resumeString: "",
      port: "8002",
    },
    containerConfig: {
      sshdCmd: "/usr/sbin/sshd -D",
      containerType: "m2container",
    },
    startInstance: {
      host: "127.0.0.1",
      username: "m2user",
      port: "123",
      sshKey: "/home/ubuntu/InteractiveShell/id_rsa",
      containerName: "",
    },
    perContainerResources: {
      cpuShares: 2,
      memory: 256,
    },
    hostConfig: {
      minContainerAge: 10,
      maxContainerNumber: 1,
      containerType: "m2container",
      sshdCmd: "/usr/sbin/sshd -D",
      dockerCmdPrefix: "sudo ",
      host: "192.168.2.42",
      username: "ubuntu",
      port: "22",
      sshKey: "/home/ubuntu/keys/host_key",
    },
    help: require("./HelpMacaulay2").help(),
  };

  const overrideDefaultOptions = function(overrideOptions, defaultOptions) {
    for (const opt in overrideOptions) {
      if (defaultOptions.hasOwnProperty(opt)) {
        if (defaultOptions[opt] instanceof Function) {
          defaultOptions[opt] = overrideOptions[opt];
        } else if (defaultOptions[opt] instanceof Object) {
          overrideDefaultOptions(overrideOptions[opt], defaultOptions[opt]);
        } else {
          defaultOptions[opt] = overrideOptions[opt];
        }
      } else {
        defaultOptions[opt] = overrideOptions[opt];
      }
    }
  };

  overrideDefaultOptions(inputOptions, options);
  next(options);
};

exports.getConfig = configuration;
