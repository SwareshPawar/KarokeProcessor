@echo off
echo Setting up for Vercel deployment...

cd frontend
copy .env.vercel .env
echo ✓ Environment configured for Vercel

cd ..
echo ✓ Ready to deploy to Vercel!
echo Run: git add . && git commit -m "Deploy to Vercel" && git push origin main
echo Then: npx vercel --prod