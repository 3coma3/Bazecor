import PropTypes from "prop-types";
import React, { Component } from "react";
import { ipcRenderer } from "electron";
import fs from "fs";
import Slider from "@appigram/react-rangeslider";
import i18n from "@Renderer/i18n";
import { toast } from "react-toastify";
import ToastMessage from "@Renderer/component/ToastMessage";

// React Bootstrap Components
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// Own Components
import Title from "../../component/Title";
import BackupFolderConfigurator from "../BackupFolderConfigurator";

// Icons Imports
import { IconArrowDownWithLine, IconFloppyDisk } from "../../component/Icon";

import Focus from "../../../api/focus";
import Store from "../../utils/Store";

const store = Store.getStore();

export default class BackupSettings extends Component {
  constructor(props) {
    super(props);

    this.state = {
      backupFolder: "",
      storeBackups: 13,
    };
  }

  componentDidMount() {
    this.setState({
      backupFolder: store.get("settings.backupFolder"),
    });

    this.setState({
      storeBackups: store.get("settings.backupFrequency"),
    });
  }

  ChooseBackupFolder = async () => {
    const options = {
      title: i18n.keyboardSettings.backupFolder.title,
      buttonLabel: i18n.keyboardSettings.backupFolder.windowButton,
      properties: ["openDirectory"],
    };

    const resp = await ipcRenderer.invoke("open-dialog", options);

    if (!resp.canceled) {
      console.log(resp.filePaths);
      this.setState({
        backupFolder: resp.filePaths[0],
      });
      store.set("settings.backupFolder", `${resp.filePaths[0]}`);
    } else {
      console.log("user closed backup folder dialog");
    }
  };

  GetBackup = async () => {
    const { backupFolder } = this.state;
    const options = {
      title: i18n.keyboardSettings.backupFolder.restoreTitle,
      buttonLabel: i18n.keyboardSettings.backupFolder.windowRestore,
      defaultPath: backupFolder,
      filters: [
        { name: "Json", extensions: ["json"] },
        { name: i18n.dialog.allFiles, extensions: ["*"] },
      ],
    };

    const resp = await ipcRenderer.invoke("open-dialog", options);

    if (!resp.canceled) {
      console.log(resp.filePaths);
      let loadedFile;
      try {
        loadedFile = JSON.parse(fs.readFileSync(resp.filePaths[0]));
        if (loadedFile.virtual !== undefined) {
          this.restoreVirtual(loadedFile.virtual);
          console.log("Restored Virtual backup");
          return;
        }
        if (loadedFile.backup !== undefined || loadedFile[0].command !== undefined) {
          this.restoreBackup(loadedFile);
          console.log("Restored normal backup");
        }
      } catch (e) {
        console.error(e);
        alert("The file is not a valid global backup");
      }
    } else {
      console.log("user closed SaveDialog");
    }
  };

  setStoreBackups = value => {
    console.log("changed backup period to: ", value);
    this.setState({
      storeBackups: value,
    });
    store.set("settings.backupFrequency", value);
  };

  async restoreBackup(backup) {
    const { neurons, neuronID } = this.props;
    const focus = new Focus();
    let data = [];
    if (Array.isArray(backup)) {
      data = backup;
    } else {
      data = backup.backup;
      // TODO: IF THE USER WANTS!! --> Until this can be chosen, disabling this behaviour --> Re enabled due to users tagging this as a bug
      const localNeurons = [...neurons];
      const index = localNeurons.findIndex(n => n.id === neuronID);
      localNeurons[index] = backup.neuron;
      localNeurons[index].id = neuronID;
      store.set("neurons", localNeurons);
    }
    try {
      for (let i = 0; i < data.length; i += 1) {
        let val = data[i].data;
        // Boolean values needs to be sent as int
        if (typeof val === "boolean") {
          val = +val;
        }
        // TODO: remove this block when necessary
        if (focus.device.info.product === "Defy") {
          // if (data[i].command.includes("macros") || data[i].command.includes("superkeys")) continue;
        }
        console.log(`Going to send ${data[i].command} to keyboard`);
        await focus.command(`${data[i].command} ${val}`.trim());
      }
      await focus.command("led.mode 0");
      console.log("Restoring all settings");
      console.log("Firmware update OK");
      toast.success(
        <ToastMessage
          title="Backup restored successfully"
          content="Your backup was restored successfully to the device!"
          icon={<IconArrowDownWithLine />}
        />,
        {
          autoClose: 2000,
          icon: "",
        },
      );
      return true;
    } catch (e) {
      console.log(`Restore settings: Error: ${e.message}`);
      return false;
    }
  }

  async restoreVirtual(virtual) {
    const focus = new Focus();
    try {
      console.log("Restoring all settings");
      for (const command in virtual) {
        if (virtual[command].eraseable === true) {
          console.log(`Going to send ${command} to keyboard`);
          await focus.command(`${command} ${virtual[command].data}`.trim());
        }
      }
      await focus.command("led.mode 0");
      console.log("Settings restored OK");
      toast.success(
        <ToastMessage
          title="Backup restored successfully"
          content="Your backup was restored successfully to the device!"
          icon={<IconArrowDownWithLine />}
        />,
        {
          autoClose: 2000,
          icon: "",
        },
      );
      return true;
    } catch (e) {
      console.log(`Restore settings: Error: ${e.message}`);
      return false;
    }
  }

  render() {
    const { connected } = this.props;
    const { backupFolder, storeBackups } = this.state;
    return (
      <Card className="overflowFix card-preferences mt-4">
        <Card.Title>
          <Title text={i18n.keyboardSettings.backupFolder.header} headingLevel={3} svgICO={<IconFloppyDisk />} />
        </Card.Title>
        <Card.Body className="pb-0">
          <Form.Group controlId="backupFolder" className="mb-0">
            <Row>
              <Col>
                <BackupFolderConfigurator
                  chooseBackupFolder={this.ChooseBackupFolder}
                  getBackup={this.GetBackup}
                  backupFolder={backupFolder}
                  connected={connected}
                />
              </Col>
            </Row>
            <Row>
              <Col className="mt-3">
                <Form.Label>{i18n.keyboardSettings.backupFolder.storeTime}</Form.Label>
              </Col>
            </Row>
            <Row>
              <Col xs={2} className="p-0 text-center align-self-center">
                <span className="tagsfix">1 month</span>
              </Col>
              <Col xs={8} className="px-1">
                <Slider min={0} max={13} step={1} value={storeBackups} onChange={this.setStoreBackups} />
              </Col>
              <Col xs={2} className="p-0 text-center align-self-center">
                <span className="tagsfix">Forever</span>
              </Col>
            </Row>
          </Form.Group>
        </Card.Body>
      </Card>
    );
  }
}

BackupSettings.propTypes = {
  neurons: PropTypes.array.isRequired,
  selectedNeuron: PropTypes.number.isRequired,
  neuronID: PropTypes.string.isRequired,
  connected: PropTypes.bool.isRequired,
};
