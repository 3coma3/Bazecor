// -*- mode: js-jsx -*-
/* Bazecor
 * Copyright (C) 2022  Dygmalab, Inc.
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Styled from "styled-components";
import { useMachine } from "@xstate/react";
import i18n from "../../i18n";

// State machine
import DeviceChecks from "../../controller/FlashingSM/DeviceChecks";

// Visual components
import Title from "../../component/Title";
import Callout from "../../component/Callout";
import { RegularButton } from "../../component/Button";
import { FirmwareLoader } from "../../component/Loader";
import AccordionFirmware from "../../component/Accordion/AccordionFirmware";

import FirmwareNeuronStatus from "./FirmwareNeuronStatus";
import FirmwareWarningList from "./FirmwareWarningList";

const Style = Styled.div`
width: 100%;
height:inherit;
.firmware-wrapper {
  max-width: 960px;
  width: 100%;
  margin: auto;

  .firmware-row {
    width: 100%;
    display: flex;
    flex-wrap: nowrap;
  }
  .firmware-content {
    flex: 0 0 66%;
    background: ${({ theme }) => theme.styles.firmwareUpdatePanel.backgroundContent};
  }
  .firmware-sidebar {
    flex: 0 0 34%;
    background: ${({ theme }) => theme.styles.firmwareUpdatePanel.backgroundSidebar};
  }
  .firmware-content--inner {
    padding: 32px;
    letter-spacing: -0.01em;
    strong {
      font-weight: 601;
    }
  }

  .borderLeftTopRadius {
    border-top-left-radius: 14px;
  }
  .borderRightTopRadius {
    border-top-right-radius: 14px;
  }
  .borderLeftBottomRadius {
    border-bottom-left-radius: 14px;
  }
  .borderRightBottomRadius {
    border-bottom-right-radius: 14px;
  }
}

.buttonActions {
  position: relative;
  display: flex;
  height: 116px;
  margin-bottom: 42px;
  margin-right: 32px;
  background-color: ${({ theme }) => theme.styles.firmwareUpdatePanel.backgroundStripeColor};
  border-bottom-right-radius: 16px;
  border-top-right-radius: 16px;
  align-items:center;
  justify-content: center;
}
.dropdownCustomFirmware {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translate3d(0, -50%,0);
  margin-top: 0;
  z-index: 9;

  .buttonToggler.dropdown-toggle.btn {
    color: ${({ theme }) => theme.styles.firmwareUpdatePanel.iconDropodownColor};
  }
}
.wrapperActions {
  display: flex;
  padding-left: 32px;
  margin-left: 32px;
  align-items: center;
  height: 116px;
  margin-bottom: 42px;
  background-color: ${({ theme }) => theme.styles.firmwareUpdatePanel.backgroundStripeColor};
  border-bottom-left-radius: 16px;
  border-top-left-radius: 16px;
  overflow: hidden;
  .button {
    align-self: center;
  }
}
.disclaimer-firmware {
  .lineColor {
      stroke: ${({ theme }) => theme.styles.firmwareUpdatePanel.neuronStatusLineWarning};
  }
}
.buttonActions .button.outline,
.buttonActions .button.primary {
  margin-right: -32px;
}
@media screen and (max-width: 1100px) {
  .buttonActions .button.primary {
    margin-right: -16px;
  }
}
@media screen and (max-width: 980px) {
  .buttonActions .button.primary {
    margin-right: 6px;
  }
}
@media screen and (max-width: 860px) {
  .buttonActions .button.primary {
    margin-right: 16px;
  }
  .dropdownCustomFirmware {
    right: 8px;
  }
  .buttonActions {
    justify-content: flex-start;
    padding-left: 8px;
  }
  .firmware-wrapper .firmware-content {
    flex: 0 0 55%;
  }
  .firmware-wrapper .firmware-sidebar {
    flex: 0 0 45%;
  }
  .badge {
    font-size: 11px;
    font-weight: 600;
    padding: 8px;
  }
  .hidden-on-sm {
    display:none;
  }
}
`;

function FirmwareCheckProcessPanel(props) {
  const { nextBlock, retryBlock, errorBlock, context } = props;
  const [state, send] = useMachine(DeviceChecks, { context: { device: context.device, firmwares: context.firmwares } });
  const [listItems, setlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (state.context.stateblock > 4) {
      setLoading(false);
    }
    if (state.matches("success")) nextBlock(state.context);
  }, [state.context, state, nextBlock, errorBlock]);

  useEffect(() => {
    const newValue = ["sideLeftOk", "sideLeftBL", "sideRightOK", "sideRightBL", "backup"].map((text, index) => {
      let checked = text.includes("BL") ? !state.context[text] : state.context[text];
      if (text === "backup") {
        checked = state.context.backup !== undefined;
      }
      // console.log(text, state.context[text], String(state.context[text]), String(state.context[text]).includes("true"), checked);
      return { id: index, text, checked };
    });
    // console.log("Setting checks", newValue);
    setlistItems(newValue);
  }, [state.context]);

  return (
    <Style>
      {loading ? (
        <FirmwareLoader />
      ) : (
        <div>
          {state.context.device.info.product !== "Raise" ? (
            <div className="firmware-wrapper disclaimer-firmware">
              <div className="firmware-row">
                <div className="firmware-content borderLeftTopRadius">
                  <div className="firmware-content--inner">
                    <Title
                      text={
                        !state.context.sideLeftOk || !state.context.sideRightOK
                          ? i18n.firmwareUpdate.texts.errorTitle
                          : i18n.firmwareUpdate.texts.disclaimerTitle
                      }
                      headingLevel={3}
                      type={!state.context.sideLeftOk || !state.context.sideRightOK ? "warning" : "default"}
                    />
                    {state.context.sideLeftOk && state.context.sideRightOK ? (
                      <>
                        <div
                          className="disclaimerContent"
                          dangerouslySetInnerHTML={{ __html: i18n.firmwareUpdate.texts.disclaimerContent }}
                        />
                        <div
                          className="disclaimerContent"
                          dangerouslySetInnerHTML={{ __html: i18n.firmwareUpdate.texts.disclaimerContent3 }}
                        />
                        <Callout content={i18n.firmwareUpdate.texts.disclaimerContent2} size="sm" className="mt-lg" />
                      </>
                    ) : (
                      ""
                    )}
                    <FirmwareWarningList
                      leftSideOK={state.context.sideLeftOk}
                      rightSideOK={state.context.sideRightOK}
                      leftSideBL={state.context.sideLeftBL}
                    />
                    {state.context.device.info.product !== "Raise" ? <AccordionFirmware items={listItems} /> : ""}
                  </div>
                </div>
                <div className="firmware-sidebar borderRightTopRadius">
                  <FirmwareNeuronStatus
                    isUpdated={state.context.isUpdated}
                    status={!state.context.sideLeftOk || !state.context.sideRightOK ? "warning" : "waiting"}
                    deviceProduct={state.context.device.info.product}
                    keyboardType={state.context.device.info.keyboardType}
                  />
                </div>
              </div>
              <div className="firmware-row">
                <div className="firmware-content borderLeftBottomRadius">
                  <div className="wrapperActions">
                    <RegularButton
                      className="flashingbutton nooutlined"
                      styles="outline transp-bg"
                      buttonText={
                        !state.context.sideLeftOk || !state.context.sideRightOK
                          ? i18n.firmwareUpdate.texts.cancelButton
                          : i18n.firmwareUpdate.texts.backwds
                      }
                      onClick={() => {
                        retryBlock();
                      }}
                    />
                  </div>
                </div>
                <div className="firmware-sidebar borderRightBottomRadius">
                  <div className="buttonActions">
                    {state.context.sideLeftOk && state.context.sideRightOK && state.context.backup ? (
                      <RegularButton
                        className="flashingbutton nooutlined"
                        styles="primary"
                        buttonText={i18n.firmwareUpdate.texts.letsStart}
                        onClick={() => send("PRESSED")}
                      />
                    ) : (
                      <RegularButton
                        className="flashingbutton nooutlined"
                        styles="primary"
                        buttonText={i18n.general.retry}
                        onClick={() => {
                          send("RETRY");
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            ""
          )}
        </div>
      )}
    </Style>
  );
}

FirmwareCheckProcessPanel.propTypes = {
  nextBlock: PropTypes.func,
  retryBlock: PropTypes.func,
  errorBlock: PropTypes.func,
  context: PropTypes.object,
};

export default FirmwareCheckProcessPanel;
