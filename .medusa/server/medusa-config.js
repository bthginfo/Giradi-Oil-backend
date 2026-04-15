"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
(0, utils_1.loadEnv)(process.env.NODE_ENV || "development", process.cwd());
console.log("========== MEDUSA CONFIG DEBUG ==========");
console.log("S3_ACCESS_KEY set:", !!process.env.SUPABASE_S3_ACCESS_KEY);
console.log("S3_SECRET_KEY set:", !!process.env.SUPABASE_S3_SECRET_KEY);
console.log("Modules.FILE =", utils_1.Modules.FILE);
console.log("==========================================");
exports.default = (0, utils_1.defineConfig)({
    projectConfig: {
        databaseUrl: process.env.DATABASE_URL || "postgres://localhost/medusa",
        http: {
            storeCors: process.env.STORE_CORS || "https://giradi.vercel.app",
            adminCors: process.env.ADMIN_CORS || "https://giradi-backend.onrender.com",
            authCors: process.env.AUTH_CORS || "https://giradi.vercel.app",
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
    ],
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVkdXNhLWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL21lZHVzYS1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxREFBMEU7QUFFMUUsSUFBQSxlQUFPLEVBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksYUFBYSxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFBO0FBRTdELE9BQU8sQ0FBQyxHQUFHLENBQUMsMkNBQTJDLENBQUMsQ0FBQTtBQUN4RCxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUE7QUFDdkUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO0FBQ3ZFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsZUFBTyxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNENBQTRDLENBQUMsQ0FBQTtBQUV6RCxrQkFBZSxJQUFBLG9CQUFZLEVBQUM7SUFDMUIsYUFBYSxFQUFFO1FBQ2IsV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxJQUFJLDZCQUE2QjtRQUN0RSxJQUFJLEVBQUU7WUFDSixTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksMkJBQTJCO1lBQ2hFLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxxQ0FBcUM7WUFDMUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxJQUFJLDJCQUEyQjtZQUM5RCxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksYUFBYTtZQUNsRCxZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLElBQUksYUFBYTtTQUN6RDtLQUNGO0lBQ0QsT0FBTyxFQUFFO1FBQ1A7WUFDRSxHQUFHLEVBQUUsZUFBTyxDQUFDLElBQUk7WUFDakIsT0FBTyxFQUFFLGdCQUFnQjtZQUN6QixPQUFPLEVBQUU7Z0JBQ1AsU0FBUyxFQUFFO29CQUNUO3dCQUNFLE9BQU8sRUFBRSxtQkFBbUI7d0JBQzVCLEVBQUUsRUFBRSxJQUFJO3dCQUNSLE9BQU8sRUFBRTs0QkFDUCxRQUFRLEVBQUUsa0ZBQWtGOzRCQUM1RixhQUFhLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0I7NEJBQ2pELGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCOzRCQUNyRCxNQUFNLEVBQUUsWUFBWTs0QkFDcEIsTUFBTSxFQUFFLGdCQUFnQjs0QkFDeEIsUUFBUSxFQUFFLHdEQUF3RDs0QkFDbEUsd0JBQXdCLEVBQUU7Z0NBQ3hCLGNBQWMsRUFBRSxJQUFJOzZCQUNyQjt5QkFDRjtxQkFDRjtpQkFDRjthQUNGO1NBQ0Y7S0FDRjtDQUNGLENBQUMsQ0FBQSJ9