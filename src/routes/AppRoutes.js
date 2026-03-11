import React from "react";
import { Route, Routes } from "react-router-dom";
import {
  MoviesDetailPage,
  MoviesListPage,
  PageNotFound,
  SearchPage,
  HomePage,
  PopularPage,
  TopRatedPage,
  RecommendationQuizPage,
  RecommendationPage,
  ProfilePage,
  PersonDetailPage,
} from "../pages";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/movies/popular" element={<PopularPage />} />
      <Route path="/movies/top_rated" element={<TopRatedPage />} />
      <Route
        path="/movies/upcoming"
        element={
          <MoviesListPage
            key="upcoming"
            apiPath="movie/upcoming"
            title="Upcoming | FilmFiesta"
          />
        }
      />
      <Route
        path="/movies/search"
        element={<SearchPage key="search" apiPath="search/movie" />}
      />
      <Route path="/onboarding/recommendations" element={<RecommendationQuizPage />} />
      <Route path="/recommendations" element={<RecommendationPage />} />
  <Route path="/profile" element={<ProfilePage />} />
      <Route path="/people/:id" element={<PersonDetailPage />} />
      <Route path="/movies/:id" element={<MoviesDetailPage />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

export default AppRoutes;
