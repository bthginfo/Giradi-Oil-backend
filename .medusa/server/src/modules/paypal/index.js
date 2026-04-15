"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const service_1 = __importDefault(require("./service"));
const utils_1 = require("@medusajs/framework/utils");
exports.default = (0, utils_1.ModuleProvider)(utils_1.Modules.PAYMENT, {
    services: [service_1.default],
});
