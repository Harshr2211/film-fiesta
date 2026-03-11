import { useEffect } from "react"


const useDynamicTitle = (title) => {
  useEffect(() => {
    document.title = title;

    return( () =>{
        document.title = "FilmFiesta"
    }
    )
  }, [title]);
}

export default useDynamicTitle