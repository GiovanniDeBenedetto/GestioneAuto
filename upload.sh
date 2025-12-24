usage() { echo "use -m Message  or default is -m UpdateFile"; exit 0;}

while getopts "hm:" o; do
    case ${o} in
        h)
            echo "Help Message";
            usage
            ;;
        m)
            m=${OPTARG};
            ;;
    esac
done
shift $((OPTIND-1))

if [ -z "${m}" ]; then
    m="UpdateFiles";
fi

echo "Message = ${m}"




git fetch
git add .
git commit -m "${m}"
git push 