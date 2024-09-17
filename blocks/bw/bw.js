// var script = document.createElement('script');
// script.src = 'https://aem-dev-skyplus6e.goindigo.in/content/experience-fragments/skyplus6e/in/en/edge/bw.js?test';
// document.head.appendChild(script);
//bw.js
import { loadCSS, loadScript } from "../../scripts/lib-franklin.js";

const createDivWithArgs = (args) => {
    const widget = document.createElement("div");
    Object.keys(args).map((kItem) => {
        widget.setAttribute(kItem, args[kItem])
    })
    document.getElementsByTagName("body")[0].appendChild(widget);
}

export default async function decorate(block) {
    const widget = document.createElement("div");
    widget.setAttribute("data-page-type", "homepage")
    widget.setAttribute("data-component", "mf-booking-widget")
    widget.setAttribute("data-mf-id", "mf-booking-widget")
    widget.setAttribute("data-persona", "Member")
    // widget.setAttribute("id", "booking___app")
    let config = {
        mfBase: "https://app-booking-dev-skyplus6e.goindigo.in",
        dataDefault: {

        }
    };
    [...block.children].forEach((row, rowIndex) => {
        let rowName;
        [...row.children].forEach((col, colIndex) => {
            if (colIndex === 0) {
                rowName = col.textContent;
            } else {
                let splitted = rowName.split('.');
                if (splitted[0] === "other-data" && splitted[1]) {
                    config.dataDefault[splitted[1]] = col.textContent;
                } else {
                    config[rowName] = col.textContent;
                }
            }
        })
    })
    if (Object.keys(config.dataDefault).length > 0) {
        createDivWithArgs(config.dataDefault);
    }
    console.log("-----bw---matchd:::::", config)
    block.innerHTML = "";
    block.appendChild(widget);
    //setTimeout(async () => {
        //console.log("--Timeout finished::--bw.js::::::::::::::::::::::::", document.querySelectorAll("[data-component='mf-booking-widget']"))
        let remoteUrl = config.mfBase + "/remoteEntry.js"
        const envConfig = config.mfBase + "/config/env-config.js";

        await loadScript(envConfig);
        await loadScript(remoteUrl);
   // })
}
