"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
(0, utils_1.loadEnv)(process.env.NODE_ENV || "development", process.cwd());
const redisUrl = process.env.EVENTS_REDIS_URL || process.env.REDIS_URL;
const storeCors = process.env.STORE_CORS || "http://localhost:8000,https://docs.medusajs.com";
const adminCors = process.env.ADMIN_CORS ||
    "http://localhost:5173,http://localhost:9000,https://docs.medusajs.com";
const authCors = process.env.AUTH_CORS ||
    "http://localhost:5173,http://localhost:9000,http://localhost:8000,https://docs.medusajs.com";
exports.default = (0, utils_1.defineConfig)({
    projectConfig: {
        databaseUrl: process.env.DATABASE_URL || "postgres://localhost/medusa",
        redisUrl,
        http: {
            storeCors,
            adminCors,
            authCors,
            jwtSecret: process.env.JWT_SECRET || "supersecret",
            cookieSecret: process.env.COOKIE_SECRET || "supersecret",
        },
    },
    modules: [
        {
            key: utils_1.Modules.FILE,
            resolve: "@medusajs/file",
            options: {
                providers: [
                    {
                        resolve: "@medusajs/file-s3",
                        id: "s3",
                        options: {
                            file_url: "https://afawjsfbtsisryafwyyq.supabase.co/storage/v1/object/public/product-images",
                            access_key_id: process.env.SUPABASE_S3_ACCESS_KEY,
                            secret_access_key: process.env.SUPABASE_S3_SECRET_KEY,
                            region: "eu-north-1",
                            bucket: "product-images",
                            endpoint: "https://afawjsfbtsisryafwyyq.supabase.co/storage/v1/s3",
                            additional_client_config: {
                                forcePathStyle: true,
                            },
                        },
                    },
                ],
            },
        },
        {
            key: utils_1.Modules.EVENT_BUS,
            resolve: "@medusajs/event-bus-redis",
            options: {
                redisUrl,
            },
        },
    ],
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVkdXNhLWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL21lZHVzYS1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxREFBMEU7QUFFMUUsSUFBQSxlQUFPLEVBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksYUFBYSxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFBO0FBRTdELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUE7QUFDdEUsTUFBTSxTQUFTLEdBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksaURBQWlELENBQUE7QUFDN0UsTUFBTSxTQUFTLEdBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVO0lBQ3RCLHVFQUF1RSxDQUFBO0FBQ3pFLE1BQU0sUUFBUSxHQUNaLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUztJQUNyQiw2RkFBNkYsQ0FBQTtBQUUvRixrQkFBZSxJQUFBLG9CQUFZLEVBQUM7SUFDMUIsYUFBYSxFQUFFO1FBQ2IsV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxJQUFJLDZCQUE2QjtRQUN0RSxRQUFRO1FBQ1IsSUFBSSxFQUFFO1lBQ0osU0FBUztZQUNULFNBQVM7WUFDVCxRQUFRO1lBQ1IsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLGFBQWE7WUFDbEQsWUFBWSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxJQUFJLGFBQWE7U0FDekQ7S0FDRjtJQUNELE9BQU8sRUFBRTtRQUNQO1lBQ0UsR0FBRyxFQUFFLGVBQU8sQ0FBQyxJQUFJO1lBQ2pCLE9BQU8sRUFBRSxnQkFBZ0I7WUFDekIsT0FBTyxFQUFFO2dCQUNQLFNBQVMsRUFBRTtvQkFDVDt3QkFDRSxPQUFPLEVBQUUsbUJBQW1CO3dCQUM1QixFQUFFLEVBQUUsSUFBSTt3QkFDUixPQUFPLEVBQUU7NEJBQ1AsUUFBUSxFQUFFLGtGQUFrRjs0QkFDNUYsYUFBYSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCOzRCQUNqRCxpQkFBaUIsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQjs0QkFDckQsTUFBTSxFQUFFLFlBQVk7NEJBQ3BCLE1BQU0sRUFBRSxnQkFBZ0I7NEJBQ3hCLFFBQVEsRUFBRSx3REFBd0Q7NEJBQ2xFLHdCQUF3QixFQUFFO2dDQUN4QixjQUFjLEVBQUUsSUFBSTs2QkFDckI7eUJBQ0Y7cUJBQ0Y7aUJBQ0Y7YUFDRjtTQUNGO1FBQ0Q7WUFDRSxHQUFHLEVBQUUsZUFBTyxDQUFDLFNBQVM7WUFDdEIsT0FBTyxFQUFFLDJCQUEyQjtZQUNwQyxPQUFPLEVBQUU7Z0JBQ1AsUUFBUTthQUNUO1NBQ0Y7S0FDRjtDQUNGLENBQUMsQ0FBQSJ9