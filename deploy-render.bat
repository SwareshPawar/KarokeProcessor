@echo off
echo Setting up for Render deployment...

cd frontend
copy .env.render .env
echo ✓ Environment configured for Render

cd ..
echo ✓ Ready to deploy to Render!
echo Run: git add . && git commit -m "Deploy to Render" && git push origin main